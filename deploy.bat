@echo off
echo 正在部署到Cloudflare Pages...
wrangler pages deploy . --project-name=hours-guard
if %ERRORLEVEL% EQU 0 (
    echo ✅ 部署成功！
    echo 🌐 访问: https://hours-guard.pages.dev
) else (
    echo ❌ 部署失败，请检查错误信息
)
pause