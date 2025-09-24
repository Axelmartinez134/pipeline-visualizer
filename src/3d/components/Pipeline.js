/**
 * Pipeline Component
 * Manages 3D pipeline rendering and water flow animations
 */

import { STAGE_CONFIG, PIPELINE_CONFIG, BUSINESS_METRICS } from '../constants/businessData.js';
import { MATERIAL_COLORS } from '../constants/cameraSettings.js';
import { DeviceDetection } from '../utils/deviceDetection.js';
import { Text } from 'troika-three-text';

export class Pipeline {
  constructor(scene, businessData) {
    this.scene = scene;
    this.businessData = businessData;
    this.pipelineGroup = new THREE.Group();
    this.pipes = [];
    this.waterFlows = [];
    this.connectors = [];
    this.labels = []; // Store sprite text labels
    this.isSimulating = false;
    this.currentScenario = 'current';

    // Track baseline and improved stage for optimized scenario
    this.optimizedBaseline = null;
    this.optimizedImprovedStage = null;
    this.optimizedBaselineThirdDistinct = null;
    this.optimizedDeltaStep = null;
    this.lastImprovement = null;
    
    // Dynamic normalization bounds (used in optimized scenario)
    this.normMin = PIPELINE_CONFIG.MIN_POSSIBLE_CAPACITY;
    this.normMax = PIPELINE_CONFIG.MAX_POSSIBLE_CAPACITY;
    this.normFrozen = false;
    
    // Label names for each stage
    this.stageLabels = {
      leadGen: 'Marketing',
      qualification: 'Sales',
      onboarding: 'Onboarding',
      delivery: 'Fulfillment',
      retention: 'Retention'
    };
    
    this.scene.add(this.pipelineGroup);
  }

  create() {
    try {
      this.clear();
      
      const stages = STAGE_CONFIG.STAGES;
      const stagePositions = STAGE_CONFIG.STAGE_POSITIONS;
      const capacities = stages.map(stage => this.businessData[stage]);

      // Use static normalization across both scenarios to avoid rescaling on toggle
      this.normMin = PIPELINE_CONFIG.MIN_POSSIBLE_CAPACITY;
      this.normMax = PIPELINE_CONFIG.MAX_POSSIBLE_CAPACITY;
      this.normFrozen = false;
      
      // Find bottleneck
      const minCapacity = Math.min(...capacities);
      const bottleneckIndex = capacities.indexOf(minCapacity);
      
      stages.forEach((stage, index) => {
        this.createPipeStage(stage, index, stagePositions[index], capacities[index], bottleneckIndex);
        
        // Create connectors between pipes
        if (index < stages.length - 1) {
          this.createConnector(stagePositions[index]);
        }
      });

      return stagePositions; // Return positions for thought bubble creation
    } catch (error) {
      console.error('Error in Pipeline.create:', error);
      return [];
    }
  }

  createPipeStage(stage, index, position, capacity, bottleneckIndex) {
    try {
      // Calculate pipe radius; allow overflow growth in optimized
      const rawNorm = (capacity - this.normMin) / (this.normMax - this.normMin);
      const baseNorm = Math.max(0, Math.min(1, rawNorm));
      const overflow = this.currentScenario === 'optimized' ? Math.max(0, rawNorm - 1) : 0;
      const baseRadius = PIPELINE_CONFIG.MIN_RADIUS + (baseNorm * (PIPELINE_CONFIG.MAX_RADIUS - PIPELINE_CONFIG.MIN_RADIUS));
      const radius = baseRadius + overflow * (PIPELINE_CONFIG.MAX_RADIUS * 0.65); // clearer extra growth
      
      // Create pipe geometry
      const pipeGeometry = new THREE.CylinderGeometry(
        radius, 
        radius, 
        PIPELINE_CONFIG.PIPE_HEIGHT, 
        PIPELINE_CONFIG.PIPE_SEGMENTS
      );
      
      // Determine material based on state
      const pipeMaterial = this.createPipeMaterial(stage, index, bottleneckIndex);
      
      const pipe = new THREE.Mesh(pipeGeometry, pipeMaterial);
      pipe.position.set(position, 0, 0);
      pipe.rotation.z = Math.PI / 2; // Rotate to horizontal
      pipe.castShadow = true;
      pipe.receiveShadow = true;
      pipe.userData = { stage: stage, capacity: capacity };
      
      this.pipelineGroup.add(pipe);
      this.pipes.push(pipe);
      
      // Create sprite text label below the pipeline section
      this.createStageLabel(stage, position);
      
      // Create water flow if simulation is running
      if (this.isSimulating) {
        this.createWaterFlow(position, radius);
      }
    } catch (error) {
      console.error(`Error creating pipe stage ${stage}:`, error);
    }
  }

  createStageLabel(stage, position) {
    try {
      // Create crisp SDF text using troika-three-text
      const label = new Text();
      label.text = this.stageLabels[stage];
      label.color = '#1E3A8A'; // Brand blue color
      label.fontSize = 0.38; // World units height; desktop/base
      label.font = undefined; // Default sans-serif
      label.anchorX = 'center';
      label.anchorY = 'top';
      label.overflowWrap = 'normal';
      label.maxWidth = 2.2; // prevent wrapping on narrow screens
      label.outlineWidth = 0; // no outline by default
      label.depthTest = true;

      // Mobile-only readability tweaks
      try {
        if (DeviceDetection.isMobile()) {
          label.fontSize = 0.46; // ~+20%
          label.outlineWidth = 0.015;
          label.outlineColor = '#ffffff';
          label.outlineBlur = 0.5;
          label.letterSpacing = 0.02;
          label.depthTest = false; // keep on top
          label.renderOrder = 999;
        }
      } catch {}

      // Position directly below the pipeline section
      const posY = (function(){ try { return DeviceDetection.isMobile() ? -1.6 : -1.5; } catch { return -1.5; } })();
      label.position.set(position, posY, 0);
      
      // Add to pipeline group and store reference
      this.pipelineGroup.add(label);
      this.labels.push(label);
      // Ensure SDF glyphs are generated
      label.sync();
      
      console.log(`Created crisp SDF label "${this.stageLabels[stage]}" using troika-three-text`);
      
    } catch (error) {
      console.error(`Error creating label for stage ${stage}:`, error);
    }
  }

  createPipeMaterial(stage, index, bottleneckIndex) {
    let color;
    
    if (this.currentScenario === 'current') {
      color = index === bottleneckIndex ? MATERIAL_COLORS.BOTTLENECK : MATERIAL_COLORS.NORMAL;
    } else {
      // optimized: current bottleneck red, most recently improved green, others gray
      if (index === bottleneckIndex) {
        color = MATERIAL_COLORS.BOTTLENECK;
      } else if (stage === this.optimizedImprovedStage) {
        color = MATERIAL_COLORS.OPTIMIZED;
      } else {
        color = MATERIAL_COLORS.NORMAL;
      }
    }
    
    return new THREE.MeshLambertMaterial({ 
      color: color,
      transparent: true,
      opacity: stage === 'onboarding' ? 0.9 : 0.8
    });
  }

  createConnector(position) {
    const connectorGeometry = new THREE.CylinderGeometry(
      PIPELINE_CONFIG.CONNECTOR_RADIUS, 
      PIPELINE_CONFIG.CONNECTOR_RADIUS, 
      PIPELINE_CONFIG.CONNECTOR_LENGTH, 
      8
    );
    const connectorMaterial = new THREE.MeshLambertMaterial({ 
      color: MATERIAL_COLORS.CONNECTOR 
    });
    const connector = new THREE.Mesh(connectorGeometry, connectorMaterial);
    connector.position.set(position + 1.25, 0, 0);
    connector.rotation.z = Math.PI / 2;
    connector.castShadow = true;
    
    this.pipelineGroup.add(connector);
    this.connectors.push(connector);
  }

  createWaterFlow(position, radius) {
    const waterGeometry = new THREE.CylinderGeometry(
      radius * 0.7, 
      radius * 0.7, 
      1.8, 
      12
    );
    const waterMaterial = new THREE.MeshLambertMaterial({ 
      color: MATERIAL_COLORS.WATER_FLOW,
      transparent: true,
      opacity: 0.6
    });
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.position.set(position, 0, 0);
    water.rotation.z = Math.PI / 2;
    
    this.pipelineGroup.add(water);
    this.waterFlows.push(water);
    
    // Animate water flow
    this.animateWaterFlow(water);
  }

  animateWaterFlow(waterMesh) {
    // Create flowing animation
    gsap.to(waterMesh.material, {
      opacity: 0.3,
      duration: 1,
      yoyo: true,
      repeat: -1,
      ease: "power2.inOut"
    });
    
    // Scale animation to simulate flow
    gsap.to(waterMesh.scale, {
      y: 1.1,
      duration: 0.8,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut"
    });
  }

  clear() {
    // Remove all pipeline elements
    [...this.pipes, ...this.waterFlows, ...this.connectors].forEach(element => {
      this.pipelineGroup.remove(element);
      if (element.geometry) element.geometry.dispose();
      if (element.material) element.material.dispose();
    });
    
    // Remove and dispose labels
    this.labels.forEach(label => {
      this.pipelineGroup.remove(label);
      if (label.dispose) label.dispose();
    });
    
    this.pipes = [];
    this.waterFlows = [];
    this.connectors = [];
    this.labels = [];
  }

  updateStage(stage, value) {
    this.businessData[stage] = parseInt(value);
    return this.create(); // Recreate and return positions
  }

  toggleSimulation() {
    this.isSimulating = !this.isSimulating;
    return this.create(); // Recreate with/without water flow
  }

  switchScenario(scenario) {
    this.currentScenario = scenario;
    
    if (scenario === 'optimized') {
      // Capture baseline once when switching from current to optimized
      if (!this.optimizedBaseline) {
        this.optimizedBaseline = { ...this.businessData };
      }
      
      // Identify baseline 3rd distinct smallest capacity (Option A)
      const baselineCaps = STAGE_CONFIG.STAGES.map(s => this.optimizedBaseline[s]);
      const baselineDistinctSorted = Array.from(new Set(baselineCaps)).sort((a, b) => a - b);
      this.optimizedBaselineThirdDistinct = baselineDistinctSorted.length >= 3
        ? baselineDistinctSorted[2]
        : baselineDistinctSorted[baselineDistinctSorted.length - 1];
      
      // Identify current bottleneck stage
      const bottleneckStage = this.getBottleneckStage();
      this.optimizedImprovedStage = bottleneckStage;
      
      const currentValue = this.businessData[bottleneckStage];
      
      // Target = max(current + 1, baselineThirdDistinct + 1), capped (Option A)
      const firstTarget = Math.min(
        PIPELINE_CONFIG.MAX_POSSIBLE_CAPACITY,
        Math.max(currentValue + 1, this.optimizedBaselineThirdDistinct + 1)
      );
      
      this.businessData[bottleneckStage] = firstTarget;
      // Store delta so subsequent steps grow similarly to the first improvement
      this.optimizedDeltaStep = Math.max(1, firstTarget - currentValue);
      this.lastImprovement = { stage: bottleneckStage, from: currentValue, to: firstTarget };
    } else if (scenario === 'current') {
      // Restore baseline values exactly
      if (this.optimizedBaseline) {
        STAGE_CONFIG.STAGES.forEach(stage => {
          this.businessData[stage] = this.optimizedBaseline[stage];
        });
      }
      this.optimizedBaseline = null;
      this.optimizedImprovedStage = null;
      this.optimizedBaselineThirdDistinct = null;
      this.optimizedDeltaStep = null;
      this.lastImprovement = null;
      this.normFrozen = false;
    }
    
    return this.create(); // Recreate with new scenario
  }

  // Apply an additional optimization step while already in optimized scenario
  applyOptimizedStep() {
    if (this.currentScenario !== 'optimized') return null;

    // Identify current bottleneck stage
    const bottleneckStage = this.getBottleneckStage();
    this.optimizedImprovedStage = bottleneckStage;

    const currentValue = this.businessData[bottleneckStage];
    const stepDelta = Math.max(1, this.optimizedDeltaStep ?? 1);
    const target = Math.min(
      PIPELINE_CONFIG.MAX_POSSIBLE_CAPACITY,
      currentValue + stepDelta
    );
    this.businessData[bottleneckStage] = target;

    this.lastImprovement = { stage: bottleneckStage, from: currentValue, to: target };
    this.create();
    return bottleneckStage;
  }

  // Brief halo to draw attention to improved stage
  flashStageHalo(stage) {
    try {
      const pipe = this.pipes.find(p => p.userData?.stage === stage);
      if (!pipe) return;

      const baseGeom = pipe.geometry?.parameters;
      if (!baseGeom) return;

      const glowGeometry = new THREE.CylinderGeometry(
        baseGeom.radiusTop * 1.3,
        baseGeom.radiusBottom * 1.3,
        baseGeom.height * 1.1,
        baseGeom.radialSegments
      );
      const glowMaterial = new THREE.MeshLambertMaterial({
        color: 0x40c057,
        transparent: true,
        opacity: 0.45,
        emissive: 0x40c057,
        emissiveIntensity: 0.8,
        side: THREE.DoubleSide
      });
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      glowMesh.position.copy(pipe.position);
      glowMesh.rotation.copy(pipe.rotation);
      this.pipelineGroup.add(glowMesh);

      setTimeout(() => {
        this.pipelineGroup.remove(glowMesh);
        glowMesh.geometry?.dispose?.();
        glowMesh.material?.dispose?.();
      }, 1000);
    } catch (e) {
      console.warn('flashStageHalo error', e);
    }
  }

  calculateRevenue() {
    const capacities = Object.values(this.businessData);
    const bottleneckCapacity = Math.min(...capacities);
    return bottleneckCapacity * BUSINESS_METRICS.CLIENT_VALUE_ANNUAL;
  }

  getBottleneckStage() {
    const stages = STAGE_CONFIG.STAGES;
    const capacities = stages.map(stage => this.businessData[stage]);
    const minCapacity = Math.min(...capacities);
    const bottleneckIndex = capacities.indexOf(minCapacity);
    return stages[bottleneckIndex];
  }

  getEfficiency() {
    const capacities = Object.values(this.businessData);
    const bottleneckCapacity = Math.min(...capacities);
    const maxCapacity = Math.max(...capacities);
    return Math.round((bottleneckCapacity / maxCapacity) * 100);
  }

  dispose() {
    this.clear();
    this.scene.remove(this.pipelineGroup);
  }
} 