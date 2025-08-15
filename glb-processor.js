#!/usr/bin/env node

/**
 * GLB Model Processor
 * Automatically extracts textures from GLB files and creates mobile-compatible GLTF versions
 * Can be used both as a CLI tool and as a module
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class GLBProcessor {
  constructor(options = {}) {
    this.outputDir = options.outputDir || './models/processed';
    this.keepOriginal = options.keepOriginal !== false;
    this.verbose = options.verbose || false;
  }

  log(message) {
    if (this.verbose) {
      console.log(`[GLB Processor] ${message}`);
    }
  }

  async checkDependencies() {
    try {
      await execAsync('which gltf-pipeline');
      return true;
    } catch (error) {
      console.error('Error: gltf-pipeline is not installed.');
      console.error('Please install it globally: npm install -g gltf-pipeline');
      return false;
    }
  }

  async processGLB(inputPath, outputName = null) {
    this.log(`Processing: ${inputPath}`);
    
    // Check if input file exists
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    // Ensure gltf-pipeline is installed
    if (!await this.checkDependencies()) {
      throw new Error('Required dependencies not installed');
    }

    // Create output directory structure
    const baseName = outputName || path.basename(inputPath, '.glb');
    const modelOutputDir = path.join(this.outputDir, baseName);
    
    // Create directories
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    
    if (!fs.existsSync(modelOutputDir)) {
      fs.mkdirSync(modelOutputDir, { recursive: true });
    }

    // Create subdirectories for desktop and mobile versions
    const desktopDir = path.join(modelOutputDir, 'desktop');
    const mobileDir = path.join(modelOutputDir, 'mobile');
    
    fs.mkdirSync(desktopDir, { recursive: true });
    fs.mkdirSync(mobileDir, { recursive: true });

    try {
      // Copy original GLB to desktop directory if keeping original
      if (this.keepOriginal) {
        const desktopGLBPath = path.join(desktopDir, `${baseName}.glb`);
        fs.copyFileSync(inputPath, desktopGLBPath);
        this.log(`Copied original GLB to: ${desktopGLBPath}`);
      }

      // Extract GLTF with separate textures for mobile
      const mobileGLTFPath = path.join(mobileDir, `${baseName}.gltf`);
      const extractCommand = `gltf-pipeline -i "${inputPath}" -o "${mobileGLTFPath}" --separate --texture-compress`;
      
      this.log('Extracting textures for mobile version...');
      const { stdout, stderr } = await execAsync(extractCommand);
      
      if (stderr && !stderr.includes('Warning')) {
        console.error('Extraction warning:', stderr);
      }
      
      this.log('Mobile version created successfully');

      // Convert textures to JPG for better mobile compatibility
      await this.convertTexturesToJPG(mobileDir);

      // Create metadata file
      const metadata = {
        originalFile: path.basename(inputPath),
        processedAt: new Date().toISOString(),
        versions: {
          desktop: {
            path: `${baseName}/desktop/${baseName}.glb`,
            format: 'glb',
            texturesEmbedded: true
          },
          mobile: {
            path: `${baseName}/mobile/${baseName}.gltf`,
            format: 'gltf',
            texturesEmbedded: false,
            textureFormat: 'jpg'
          }
        }
      };

      const metadataPath = path.join(modelOutputDir, 'metadata.json');
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      this.log(`Metadata saved to: ${metadataPath}`);

      return {
        success: true,
        outputDir: modelOutputDir,
        metadata
      };

    } catch (error) {
      console.error('Processing failed:', error.message);
      throw error;
    }
  }

  async convertTexturesToJPG(directory) {
    this.log('Converting textures to JPG format...');
    
    const files = fs.readdirSync(directory);
    const imageExtensions = ['.png', '.webp'];
    
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (imageExtensions.includes(ext)) {
        const inputPath = path.join(directory, file);
        const outputPath = path.join(directory, file.replace(ext, '.jpg'));
        
        try {
          // Try to use ImageMagick if available, otherwise skip
          await execAsync(`convert "${inputPath}" -quality 85 "${outputPath}"`);
          fs.unlinkSync(inputPath); // Remove original
          this.log(`Converted ${file} to JPG`);
        } catch (error) {
          this.log(`Could not convert ${file} (ImageMagick may not be installed)`);
        }
      }
    }
  }

  // Batch process multiple GLB files
  async processDirectory(inputDir, outputDir = null) {
    if (outputDir) {
      this.outputDir = outputDir;
    }

    const files = fs.readdirSync(inputDir);
    const glbFiles = files.filter(file => file.toLowerCase().endsWith('.glb'));
    
    console.log(`Found ${glbFiles.length} GLB files to process`);
    
    const results = [];
    for (const file of glbFiles) {
      const inputPath = path.join(inputDir, file);
      try {
        const result = await this.processGLB(inputPath);
        results.push({ file, ...result });
      } catch (error) {
        results.push({ file, success: false, error: error.message });
      }
    }
    
    return results;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
GLB Model Processor - Extract textures and create mobile-compatible versions

Usage:
  node glb-processor.js <input.glb> [output-name]
  node glb-processor.js --batch <input-directory> [output-directory]
  node glb-processor.js --install-deps

Options:
  --verbose    Show detailed processing information
  --no-keep    Don't keep the original GLB file

Examples:
  node glb-processor.js models/room.glb
  node glb-processor.js models/room.glb custom-room
  node glb-processor.js --batch ./models ./models/processed
  node glb-processor.js --install-deps
    `);
    process.exit(0);
  }

  if (args[0] === '--install-deps') {
    console.log('Installing dependencies...');
    exec('npm install -g gltf-pipeline', (error, stdout, stderr) => {
      if (error) {
        console.error('Failed to install dependencies:', error);
        process.exit(1);
      }
      console.log('Dependencies installed successfully');
      console.log(stdout);
    });
    return;
  }

  const processor = new GLBProcessor({
    verbose: args.includes('--verbose'),
    keepOriginal: !args.includes('--no-keep')
  });

  if (args[0] === '--batch') {
    const inputDir = args[1] || './models';
    const outputDir = args[2] || './models/processed';
    
    processor.processDirectory(inputDir, outputDir)
      .then(results => {
        console.log('\nProcessing complete:');
        results.forEach(result => {
          if (result.success) {
            console.log(`✓ ${result.file} - processed successfully`);
          } else {
            console.log(`✗ ${result.file} - failed: ${result.error}`);
          }
        });
      })
      .catch(error => {
        console.error('Batch processing failed:', error);
        process.exit(1);
      });
  } else {
    const inputPath = args[0];
    const outputName = args[1];
    
    processor.processGLB(inputPath, outputName)
      .then(result => {
        console.log('✓ Processing complete');
        console.log(`  Output directory: ${result.outputDir}`);
        console.log(`  Desktop version: ${result.metadata.versions.desktop.path}`);
        console.log(`  Mobile version: ${result.metadata.versions.mobile.path}`);
      })
      .catch(error => {
        console.error('Processing failed:', error);
        process.exit(1);
      });
  }
}

module.exports = GLBProcessor;