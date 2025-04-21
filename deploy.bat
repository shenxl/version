@echo off
:: 一键部署脚本 - 自动上传模板并部署Workers (Windows版)
:: 使用方法: deploy.bat [options]
:: 选项:
::   --no-deploy     只上传模板，不部署Worker
::   --no-upload     只部署Worker，不上传模板
::   --skip-install  跳过依赖安装
::   --local         只上传到本地KV (默认)
::   --remote        只上传到远程KV
::   --both          同时上传到本地和远程KV
::   --version       显示版本信息

setlocal enabledelayedexpansion

:: 脚本版本
set VERSION=1.0.0

:: 设置默认值
set DEPLOY_WORKER=true
set UPLOAD_TEMPLATES=true
set SKIP_INSTALL=false
set UPLOAD_TARGET=local

:: 参数解析
:parse_args
if "%~1"=="" goto :args_done
if "%~1"=="--no-deploy" (
    set DEPLOY_WORKER=false
    shift
    goto :parse_args
)
if "%~1"=="--no-upload" (
    set UPLOAD_TEMPLATES=false
    shift
    goto :parse_args
)
if "%~1"=="--skip-install" (
    set SKIP_INSTALL=true
    shift
    goto :parse_args
)
if "%~1"=="--local" (
    set UPLOAD_TARGET=local
    shift
    goto :parse_args
)
if "%~1"=="--remote" (
    set UPLOAD_TARGET=remote
    shift
    goto :parse_args
)
if "%~1"=="--both" (
    set UPLOAD_TARGET=both
    shift
    goto :parse_args
)
if "%~1"=="--version" (
    echo QuickConfig 一键部署脚本 v%VERSION%
    exit /b 0
)
echo 错误: 未知参数 %~1
echo 使用方法: deploy.bat [options]
echo 选项:
echo   --no-deploy     只上传模板，不部署Worker
echo   --no-upload     只部署Worker，不上传模板
echo   --skip-install  跳过依赖安装
echo   --local         只上传到本地KV (默认)
echo   --remote        只上传到远程KV
echo   --both          同时上传到本地和远程KV
echo   --version       显示版本信息
exit /b 1

:args_done

:: 显示欢迎信息
echo =====================================================
echo     QuickConfig 一键部署脚本 v%VERSION% (Windows)
echo =====================================================
echo.

:: 检查必要的工具
echo 检查必要的工具...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo 错误: 需要安装Node.js
    exit /b 1
)

where npx >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo 错误: 需要安装npx
    exit /b 1
)

:: 检查Wrangler是否已安装
npx wrangler --version >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Wrangler未安装，正在安装...
    call npm install -g wrangler
)

:: 检查工作目录
if not exist wrangler.toml (
    echo 错误: 没有找到wrangler.toml文件，请确保您在workers目录中运行此脚本
    exit /b 1
)

:: 检查src/template目录
if not exist src\template (
    echo 错误: 未找到src\template目录
    exit /b 1
)

:: 安装依赖
if "%SKIP_INSTALL%"=="false" (
    echo 安装依赖...
    :: 使用npm install替代npm ci，更加通用
    call npm install --no-fund --no-audit
    if %ERRORLEVEL% neq 0 (
        echo 警告: npm install失败，继续执行...
    )
) else (
    echo 跳过依赖安装...
)

:: 部署Worker
if "%DEPLOY_WORKER%"=="true" (
    echo 部署Worker到Cloudflare...
    call npx wrangler deploy
    if %ERRORLEVEL% neq 0 (
        echo Worker部署失败！
        exit /b 1
    )
    echo Worker部署成功！
)

:: 上传模板
if "%UPLOAD_TEMPLATES%"=="true" (
    echo 上传模板文件到KV存储 (%UPLOAD_TARGET%)...
    
    :: 根据上传目标调用不同参数的上传脚本
    if "%UPLOAD_TARGET%"=="local" (
        call node upload-templates.js --local
    ) else if "%UPLOAD_TARGET%"=="remote" (
        call node upload-templates.js --remote
    ) else if "%UPLOAD_TARGET%"=="both" (
        call node upload-templates.js --both
    )
    
    if %ERRORLEVEL% neq 0 (
        echo 模板上传失败！
        exit /b 1
    )
    echo 模板上传成功！
)

echo.
echo =====================================================
echo                  部署完成！
echo =====================================================

:: 提取Worker名称
for /f "tokens=2 delims== " %%a in ('findstr /C:"name =" wrangler.toml') do (
    set WORKER_NAME=%%a
    set WORKER_NAME=!WORKER_NAME:"=!
)

:: 提取当前版本
for /f "tokens=2 delims== " %%a in ('findstr /C:"CURRENT_VERSION =" wrangler.toml') do (
    set CURRENT_VERSION=%%a
    set CURRENT_VERSION=!CURRENT_VERSION:"=!
)

echo Worker URL: https://%WORKER_NAME%.workers.dev
echo API版本: %CURRENT_VERSION%
echo.
echo 您可以访问以下URL测试您的API:
echo - 版本信息: https://%WORKER_NAME%.workers.dev/api/version
echo - 模板示例: https://%WORKER_NAME%.workers.dev/template/1.0.0/basic/navigation_template.json

endlocal 