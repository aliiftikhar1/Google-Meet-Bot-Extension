#!/bin/bash

echo "Cleaning dist folder..."
rm -rf dist
mkdir -p dist

echo "Building extension files..."
npx webpack --config webpack.config.js

echo "Building popup..."
npx next build
npx next export -o dist

echo "Copying assets..."
cp -r public/* dist/
mkdir -p dist/content-scripts
cp content-scripts/content-styles.css dist/content-scripts/

echo "Build complete!"
