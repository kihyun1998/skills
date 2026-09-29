#Requires -Version 5.1
<#
.SYNOPSIS
  Sync every skill in this repo into Claude Code and/or Codex.

.DESCRIPTION
  A skill is any top-level directory in this repo containing a SKILL.md.
  By default, each skill is linked into both ~/.claude/skills and
  ~/.codex/skills (or $env:CODEX_HOME/skills when CODEX_HOME is set).

  This is a sync: links owned by this repo for skills that no longer exist are
  pruned. Real folders are never removed unless -ReplaceCopies is supplied;
  they are moved to <agent-home>/skills-replaced instead.

  install-skills.sh is this file's twin: keep their options and behaviour aligned.
#>

[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$ReplaceCopies,
    [ValidateSet('Claude', 'Codex')]
    [string[]]$Target = @('Claude', 'Codex')
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot

function Inside-Repo([string]$path) {
    if (-not $path) { return $false }
    $root = $repoRoot.TrimEnd('\')
    $candidate = $path.TrimEnd('\')
    return ($candidate -eq $root) -or $candidate.StartsWith($root + '\', [System.StringComparison]::OrdinalIgnoreCase)
}

function Compare-Shadow([string]$shadowDir, [string]$repoDir) {
    $installed = Join-Path $shadowDir 'SKILL.md'; $source = Join-Path $repoDir 'SKILL.md'
    if (-not (Test-Path $installed)) { return @{ State = 'no-skill'; Detail = 'holds no SKILL.md' } }
    $a = (Get-Content -LiteralPath $installed -Raw) -replace "`r`n", "`n"; $b = (Get-Content -LiteralPath $source -Raw) -replace "`r`n", "`n"
    if ($a -eq $b) { return @{ State = 'identical'; Detail = 'same content -- a redundant copy' } }
    $na = ($a.ToCharArray() | Where-Object { $_ -eq "`n" }).Count; $nb = ($b.ToCharArray() | Where-Object { $_ -eq "`n" }).Count
    return @{ State = 'differs'; Detail = "installed $na lines, repo $nb -- THEY DIFFER, and the installed one is what loads" }
}

function Should-InstallSkill([string]$skillDir, [string]$destination) {
    $targetsFile = Join-Path $skillDir 'agents\install-targets'
    if (-not (Test-Path $targetsFile)) { return $true }

    $targets = Get-Content -LiteralPath $targetsFile |
        ForEach-Object { $_.Trim().ToLowerInvariant() } |
        Where-Object { $_ -and -not $_.StartsWith('#') }
    if (-not $targets) { throw "No install targets declared in $targetsFile" }
    foreach ($target in $targets) {
        if ($target -notin 'claude', 'codex') { throw "Unsupported install target '$target' in $targetsFile" }
    }
    return $targets -contains $destination.ToLowerInvariant()
}

function Sync-Skills([string]$agentHome, [string]$destination) {
    $skillsHome = Join-Path $agentHome 'skills'; $backupHome = Join-Path $agentHome 'skills-replaced'
    New-Item -ItemType Directory -Path $skillsHome -Force | Out-Null
    $linked = 0; $pruned = 0; $shadowed = 0; $differing = 0
    foreach ($item in Get-ChildItem -LiteralPath $skillsHome -Force) {
        if ($item.LinkType -notin 'Junction', 'SymbolicLink') { continue }
        $linkTarget = @($item.Target)[0]
        if (-not (Inside-Repo $linkTarget)) { continue }
        $sourceDir = Join-Path $repoRoot $item.Name
        $sourceSkill = Join-Path $sourceDir 'SKILL.md'
        if (Test-Path $sourceSkill) {
            if (Should-InstallSkill $sourceDir $destination) { continue }
            Write-Host "  prune $($item.Name) - excluded from $destination"
        } else {
            Write-Host "  prune $($item.Name) - no longer a skill in this repo"
        }
        if (-not $DryRun) { [System.IO.Directory]::Delete($item.FullName, $false) }; $pruned++
    }
    $skillDirs = Get-ChildItem -LiteralPath $repoRoot -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'SKILL.md') }
    if (-not $skillDirs) { Write-Host 'No skills found (no top-level directory contains a SKILL.md).'; return }
    foreach ($skill in $skillDirs) {
        if (-not (Should-InstallSkill $skill.FullName $destination)) { continue }
        $link = Join-Path $skillsHome $skill.Name
        if (Test-Path $link) {
            $item = Get-Item -LiteralPath $link -Force
            if ($item.LinkType -in 'Junction', 'SymbolicLink') {
                $linkTarget = @($item.Target)[0]
                if ($linkTarget -and ($linkTarget.TrimEnd('\') -ieq $skill.FullName.TrimEnd('\'))) { Write-Host "  ok    $($skill.Name) - already linked"; continue }
                Write-Host "  relink $($skill.Name) - was -> $linkTarget"
                if (-not $DryRun) { [System.IO.Directory]::Delete($item.FullName, $false); New-Item -ItemType Junction -Path $link -Target $skill.FullName | Out-Null }; $linked++; continue
            }
            $comparison = Compare-Shadow $link $skill.FullName; $shadowed++; if ($comparison.State -ne 'identical') { $differing++ }
            if (-not $ReplaceCopies) { Write-Warning "  shadow $($skill.Name) - a real folder shadows the repo skill"; Write-Host "         $($comparison.Detail)"; Write-Host '         your edits in this repo are NOT live for this skill'; continue }
            $backup = Join-Path $backupHome "$($skill.Name)-$((Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss'))"
            Write-Host "  replace $($skill.Name) - $($comparison.Detail)"; Write-Host "         moving the folder to $backup (not deleted)"
            if (-not $DryRun) { New-Item -ItemType Directory -Path $backupHome -Force | Out-Null; Move-Item -LiteralPath $link -Destination $backup; New-Item -ItemType Junction -Path $link -Target $skill.FullName | Out-Null }; $linked++; continue
        }
        try { Write-Host "  link  $($skill.Name) -> $($skill.FullName)"; if (-not $DryRun) { New-Item -ItemType Junction -Path $link -Target $skill.FullName | Out-Null }; $linked++ } catch { Write-Warning "  fail  $($skill.Name) - $($_.Exception.Message)" }
    }
    $prefix = if ($DryRun) { '[dry-run] ' } else { '' }; $summary = "${prefix}Done. $linked linked/relinked, $pruned pruned"
    if ($shadowed -gt 0 -and -not $ReplaceCopies) { $summary += ", $shadowed SHADOWED ($differing differing from the repo)" }
    Write-Host "$summary in $skillsHome."
    if ($shadowed -gt 0 -and -not $ReplaceCopies) { Write-Host "Re-run with -ReplaceCopies to move shadowed folders to $backupHome (never deleted)." }
}

foreach ($destination in $Target | Select-Object -Unique) {
    $agentHome = if ($destination -eq 'Claude') { Join-Path $env:USERPROFILE '.claude' } elseif ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }
    Write-Host "[$destination]"; Sync-Skills $agentHome $destination
}
