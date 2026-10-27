# Sourced by each case's fixture.sh. Rebuilds a repository in the run's empty
# workspace as it stood at one commit, with no ref, remote or object that could
# show what happened after it, and copies the case's issue body in as
# .scratch/issues/<number>.md, named by number so the case name never reaches the run.
rebuild() {
    local source="$1" commit="$2" case_dir="$3" number="$4"
    git clone -q --no-local "$source" .
    git checkout -q --detach "$commit"
    git for-each-ref --format='%(refname)' | while read -r ref; do git update-ref -d "$ref"; done
    git checkout -q -b main
    git remote remove origin 2>/dev/null || true
    git reflog expire --expire=now --all
    git gc -q --prune=now
    mkdir -p .scratch/issues
    cp "$case_dir/issue.md" ".scratch/issues/$number.md"
}
