#Requires -Version 5.1
<#
.SYNOPSIS
  Sync every mod in this repo's mods/ into Claude Code as a user-scope plugin.

.DESCRIPTION
  Runs install-mods.mjs, which holds the logic; see its header. Each mod is
  validated and installed from this repo's marketplace, the marketplace file is
  rewritten from mods/, and a plugin whose mod folder is gone is uninstalled.

  install-mods.sh is this file's twin: both only pass their options through.
#>

[CmdletBinding()]
param(
    [switch]$Uninstall,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$passed = @()
if ($Uninstall) { $passed += '--uninstall' }
if ($DryRun) { $passed += '--dry-run' }
& node (Join-Path $PSScriptRoot 'install-mods.mjs') @passed
exit $LASTEXITCODE
