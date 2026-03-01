#!/bin/sh
echo '🚀 === CONFIG DEBUG START ==='
echo '📍 Working dir: $(pwd)'
echo '🐳 NODE_ENV: $NODE_ENV'
echo '📁 Config dir contents:'
ls -la /home/node/app/config/ 2>/dev/null || echo '❌ Config dir EMPTY or missing!'
echo '📄 production.yaml exists? $([ -f /home/node/app/config/production.yaml ] && echo "✅ YES" || echo "❌ NO")'

if [ -f /home/node/app/config/production.yaml ]; then
  echo '📋 Config file content:'
  cat /home/node/app/config/production.yaml
else
  echo '❌ No production.yaml - checking all files:'
  find /home/node/app -name '*.yaml' -o -name '*.yml' 2>/dev/null
fi

echo '🔍 Testing Node.js config load:'
node -e "
  const fs = require('fs');
  const path = '/home/node/app/config/production.yaml';
  try {
    if (fs.existsSync(path)) {
      console.log('✅ Config file found, content:');
      console.log(fs.readFileSync(path, 'utf-8'));
    } else {    
        console.error('❌ Config file not found at ' + path);
        }
    } catch (err) {
        console.error('❌ Error reading config file:', err);
        }
"
echo '🚀 === CONFIG DEBUG END ==='