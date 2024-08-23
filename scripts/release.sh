#!/bin/bash

SCRIPT=`realpath $0`
LOCAL_BASEDIR=$(dirname "${SCRIPT}")

VERSION=$1
VERSION_KEY="v${VERSION}"

# Update version and commit
echo "Create Build: ${VERSION}"
npx replace-json-property ./package.json version $VERSION
git add ./package.json
git commit -m "build(release): $VERSION"

# Generate changelog
echo "Generate CHANGELOG"
npx git-conventional-commits changelog --release $VERSION --file 'CHANGELOG.md'
git add ./CHANGELOG.md
git commit -m "docs(release): create $VERSION change log entry"

# Add tag
echo "Create Tag"
git tag -a -m "build(release): $VERSION" "$VERSION_KEY"

# Finish
echo "You can push now"
