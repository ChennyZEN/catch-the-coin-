# Controlli prima di un rilascio. Si avvia dalle attività di VS Code (Ctrl+Shift+B).
Set-Location (Split-Path $PSScriptRoot -Parent)
$errors = 0
function Ok($m)   { Write-Host "OK       $m" -ForegroundColor Green }
function Warn($m) { Write-Host "AVVISO   $m" -ForegroundColor Yellow }
function Bad($m)  { Write-Host "ERRORE   $m" -ForegroundColor Red; $script:errors++ }

Write-Host "=== File e maiuscole/minuscole (come sul server di Itch.io) ===" -ForegroundColor Cyan
$rootNames = (Get-ChildItem -File).Name
foreach ($f in "index.html","style.css","game.js","LICENSE","README.md","CREDITS.txt") {
  if ($rootNames -ccontains $f) { Ok $f } else { Bad "manca (o maiuscole diverse): $f" }
}
if ((Get-ChildItem -Directory).Name -ccontains "Assets") { Ok "cartella Assets" } else { Bad "cartella Assets non trovata (attenzione alla A maiuscola)" }
$assetNames = if ((Get-ChildItem -Directory).Name -ccontains "Assets") { (Get-ChildItem Assets -File).Name } else { @() }
foreach ($f in "player.png","coin.png","bat.png","music_menu.mp3","music_game.mp3") {
  if ($assetNames -ccontains $f) { Ok "Assets/$f" } else { Bad "manca Assets/$f" }
}

Write-Host "=== Marcatori di conflitto ===" -ForegroundColor Cyan
$hits = Get-ChildItem -Recurse -File -Include *.html,*.js,*.css,*.md,*.txt,*.yml,LICENSE |
  Where-Object { $_.FullName -notmatch '\\(node_modules|\.git|dist|Itch-build|build)\\' } |
  Select-String -Pattern '^(<<<<<<<|=======|>>>>>>>)'
if ($hits) { $hits | ForEach-Object { Bad "marcatore di conflitto in $($_.Path):$($_.LineNumber)" } }
else { Ok "nessun marcatore di conflitto" }

Write-Host "=== Versione ===" -ForegroundColor Cyan
$html = Get-Content index.html -Raw
$v = $null
if ($html -match 'class="version">v(\d+\.\d+\.\d+)') { $v = $Matches[1]; Ok "versione in index.html: v$v" }
else { Bad "etichetta della versione non trovata in index.html" }
if ($v) {
  if ((Get-Content README.md -Raw) -match ("### v" + [regex]::Escape($v))) { Ok "README ha la sezione v$v" } else { Bad "README senza la sezione v$v" }
  if (Test-Path "release-notes/v$v.md") { Ok "release-notes/v$v.md" } else { Bad "manca release-notes/v$v.md" }
  $q = [regex]::Matches($html, '\?v=(\d+\.\d+\.\d+)') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
  if (@($q).Count -eq 0 -or (@($q).Count -eq 1 -and $q -eq $v)) { Ok "parametri ?v= coerenti" } else { Bad "parametri ?v= non coerenti: $($q -join ', ')" }
}

Write-Host "=== Codice ===" -ForegroundColor Cyan
if (Select-String -Path game.js -Pattern 'console\.log|debugger' -Quiet) { Warn "game.js contiene console.log o debugger" } else { Ok "nessun console.log o debugger" }
if (Get-Command node -ErrorAction SilentlyContinue) {
  node --check game.js
  if ($LASTEXITCODE -eq 0) { Ok "game.js: sintassi valida" } else { Bad "game.js: errore di sintassi" }
} else { Warn "Node.js non installato: salto il controllo di sintassi" }

Write-Host "=== Git ===" -ForegroundColor Cyan
if (git status --porcelain) { Warn "ci sono modifiche non salvate in Git" } else { Ok "nessuna modifica in sospeso" }
if ($v) {
  if (git tag -l "v$v") { Warn "il tag v$v esiste già" } else { Ok "il tag v$v non esiste ancora (pronto per il rilascio)" }
}

Write-Host ""
if ($errors -eq 0) { Write-Host "Tutto a posto." -ForegroundColor Green }
else { Write-Host "$errors problema/i da correggere prima del rilascio." -ForegroundColor Red; exit 1 }
