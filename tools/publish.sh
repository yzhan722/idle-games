#!/usr/bin/env bash
# Publish the current master's working tree to the private GitHub repo.
#
# The remote (mine/master) is a history-free snapshot — pushing real history
# trips GitHub's `workflow` OAuth scope check because upstream commits touch
# .github/workflows. So we squash the tree onto the orphan `release-v1`
# branch and push that.
#
#   tools/publish.sh [message]
set -e
cd "$(dirname "$0")/.."

MSG="${1:-snapshot $(date +%Y-%m-%d)}"
REMOTE="${REMOTE:-mine}"
BRANCH="release-v1"

git fetch "$REMOTE" -q 2>/dev/null || true

if git show-ref --verify -q "refs/heads/$BRANCH"; then
	git checkout -q "$BRANCH"
else
	git checkout --orphan "$BRANCH"
fi

# rebuild index from master's tree exactly (handles added/deleted files)
git rm -r --cached . -q 2>/dev/null || true
git checkout master -- .
git add -A
git rm -rf .github -q --ignore-unmatch || true

git -c user.name="Devin" -c user.email="devin@localhost" \
	commit -m "$MSG" -q
# snapshot channel: remote master is replaced wholesale; lease guards against
# clobbering a remote update we have not fetched yet
git push --force-with-lease -u "$REMOTE" "$BRANCH":master

git checkout -q master
echo "published: $MSG -> $REMOTE/master"
