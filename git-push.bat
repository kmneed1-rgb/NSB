@echo off
cd /d d:\app\nsb1ali
git config user.name "kmneed1-rgb"
git config user.email "kmneed1@users.noreply.github.com"
git add . > d:\app\push.log 2>&1
git commit -m "Fix fee collection rollover + button shadows" >> d:\app\push.log 2>&1
git push https://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@github.com/kmneed1-rgb/NSB.git main >> d:\app\push.log 2>&1
echo DONE >> d:\app\push.log

