const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      // Find all alert(...) calls
      const alertRegex = /alert\s*\((.*?)\)/g;
      
      content = content.replace(alertRegex, (match, p1) => {
        modified = true;
        const lowerP1 = p1.toLowerCase();
        if (lowerP1.includes('success') || lowerP1.includes('copied')) {
          return `toast.success(${p1})`;
        } else {
          return `toast.error(${p1})`;
        }
      });

      if (modified) {
        if (!content.includes('import toast from') && !content.includes('import { toast }')) {
          // Add import at the top
          content = `import toast from 'react-hot-toast';\n` + content;
        }
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated', fullPath);
      }
    }
  }
}

processDir('./src');
