@echo off
title RetractionWatch Database Console
cls

echo ========================================================
echo   URUCHAMIANIE SRODOWISKA RETRACTION WATCH
echo ========================================================
echo.

:: 1. Sprawdzamy czy mongosh jest dostepny
where mongosh >nul 2>nul
if %errorlevel% neq 0 (
    echo BLAD: Nie znaleziono polecenia 'mongosh'.
    echo Upewnij sie, ze MongoDB Shell jest zainstalowany i dodany do PATH.
    pause
    exit /b
)

echo Laczenie z baza 'retractionWatch' i ladowanie logiki biznesowej...
echo.

:: 2. Uruchomienie mongosh z parametrami
:: "retractionWatch" - automatycznie robi 'use retractionWatch'
:: --shell - sprawia, ze konsola nie zamyka sie po wykonaniu skryptow
:: ^ - to znak przeniesienia komendy do nowej linii dla czytelnosci

mongosh "retractionWatchDB" --shell ^
    ".\autoinkrementacja\kolekcja_licznikow.js" ^
    ".\functions\function_add_document.js" ^
    ".\functions\function_modify_document.js"

:: Jeśli wyjdziesz z konsoli (wpisujac exit), skrypt poczeka na klawisz przed zamknieciem okna
echo.
echo Sesja zakonczona.
pause