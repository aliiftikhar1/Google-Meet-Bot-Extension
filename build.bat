@echo off
echo Cleaning dist folder...
rmdir /s /q dist
mkdir dist

echo Building extension files...
npx webpack --config webpack.config.js

echo Building popup...
npx next build
npx next export -o dist

echo Copying assets...
xcopy /s /y public\*.* dist\
xcopy /s /y content-scripts\content-styles.css dist\content-scripts\

echo Build complete!
