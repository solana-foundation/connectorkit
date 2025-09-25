#!/usr/bin/env node

/**
 * Bundle Analysis Script for @connector-kit/connector
 * Provides detailed bundle size analysis and optimization recommendations
 */

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

// Colors for console output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

async function analyzeBundle() {
  log('blue', '📦 Analyzing @connector-kit/connector bundle...\n')

  const distPath = path.join(__dirname, '../dist')
  
  if (!fs.existsSync(distPath)) {
    log('red', '❌ No dist folder found. Please run `npm run build` first.')
    process.exit(1)
  }

  // Analyze all built files
  const files = fs.readdirSync(distPath, { withFileTypes: true })
    .filter(dirent => dirent.isFile())
    .map(dirent => dirent.name)
    .filter(name => name.endsWith('.js') || name.endsWith('.mjs'))

  let totalSize = 0
  let results = []

  for (const file of files) {
    try {
      const filePath = path.resolve(distPath, file)
      const stats = fs.statSync(filePath)
      const size = stats.size
      totalSize += size
      
      // Get gzipped size using Node-native zlib
      const fileBuffer = fs.readFileSync(filePath)
      const gzippedBuffer = zlib.gzipSync(fileBuffer)
      const gzippedSize = gzippedBuffer.length
      
      results.push({
        name: file,
        size,
        gzipped: gzippedSize,
        type: file.includes('.d.') ? 'types' : 'code'
      })
    } catch (error) {
      log('yellow', `⚠️  Failed to process ${file}: ${error.message}`)
      // Skip this file and continue with the next one
      continue
    }
  }

  // Sort by size
  results.sort((a, b) => b.size - a.size)

  // Display results
  log('bold', '📊 Bundle Analysis Results:')
  console.log(''.padEnd(60, '─'))
  
  console.log(
    'File'.padEnd(25) + 
    'Size'.padEnd(12) + 
    'Gzipped'.padEnd(12) + 
    'Type'.padEnd(8)
  )
  console.log(''.padEnd(60, '─'))

  for (const result of results) {
    const sizeColor = result.size > 50000 ? 'red' : result.size > 20000 ? 'yellow' : 'green'
    
    console.log(
      result.name.padEnd(25) + 
      formatBytes(result.size).padEnd(12) + 
      formatBytes(result.gzipped).padEnd(12) + 
      result.type.padEnd(8)
    )
  }

  console.log(''.padEnd(60, '─'))
  log('bold', `Total Bundle Size: ${formatBytes(totalSize)}`)
  
  const totalGzipped = results.reduce((sum, r) => sum + r.gzipped, 0)
  log('bold', `Total Gzipped: ${formatBytes(totalGzipped)}`)

  // Optimization recommendations
  console.log('\n')
  log('blue', '💡 Optimization Recommendations:')
  
  const largeFiles = results.filter(r => r.size > 30000 && r.type === 'code')
  if (largeFiles.length > 0) {
    log('yellow', `⚠️  Large files detected (${largeFiles.length})`)
    largeFiles.forEach(file => {
      log('yellow', `   • ${file.name} (${formatBytes(file.size)}) - Consider code splitting`)
    })
  }

  // Bundle size targets
  console.log('\n')
  log('green', '🎯 Bundle Size Targets:')
  log('green', '   • Main bundle: < 25KB')
  log('green', '   • Headless bundle: < 15KB') 
  log('green', '   • React bundle: < 30KB')

  const mainBundle = results.find(r => r.name === 'index.js' || r.name === 'index.mjs')
  if (mainBundle) {
    const targetSize = 25000
    const status = mainBundle.size <= targetSize ? '✅' : '❌'
    log(mainBundle.size <= targetSize ? 'green' : 'red', 
      `   ${status} Main bundle: ${formatBytes(mainBundle.size)} (target: ${formatBytes(targetSize)})`)
  }

  // Tree-shaking analysis
  console.log('\n')
  log('blue', '🌳 Tree-shaking Analysis:')
  
  try {
    // Check for unused exports (simplified analysis)
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'))
    const mainFile = path.join(__dirname, '../src/index.ts')
    const content = fs.readFileSync(mainFile, 'utf8')
    
    const exportCount = (content.match(/^export /gm) || []).length
    log('green', `   • ${exportCount} total exports detected`)
    
    if (exportCount > 50) {
      log('yellow', '   ⚠️  High export count - ensure tree-shaking is working properly')
    }
    
  } catch (error) {
    log('yellow', '   ⚠️  Could not analyze tree-shaking')
  }
}

// Run analysis
analyzeBundle().catch(console.error)
