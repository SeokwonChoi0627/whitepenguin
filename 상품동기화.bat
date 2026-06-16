@echo off
chcp 65001 >NUL
cd /d "%~dp0"
echo ================================================
echo   White Penguin  -  Product Sync
echo   (master Excel  -^>  homepage product list)
echo ================================================
echo.
node scripts\sync-products.mjs
echo.
echo ------------------------------------------------
echo  Done. If the changes look right, commit ^& push:
echo    git add lib/products.ts data/product-presentation.json
echo    git commit -m "data: sync products"
echo    git push
echo ------------------------------------------------
pause
