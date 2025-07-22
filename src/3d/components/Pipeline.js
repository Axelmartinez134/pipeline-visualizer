/**
 * Pipeline Component
 * Manages 3D pipeline rendering and water flow animations
 */

import { STAGE_CONFIG, PIPELINE_CONFIG, BUSINESS_METRICS } from '../constants/businessData.js';
import { MATERIAL_COLORS } from '../constants/cameraSettings.js';

export class Pipeline {
  constructor(scene, businessData) {
    this.scene = scene;
    this.businessData = businessData;
    this.pipelineGroup = new THREE.Group();
    this.pipes = [];
    this.waterFlows = [];
    this.connectors = [];
    this.isSimulating = false;
    this.currentScenario = 'current';
    
    this.scene.add(this.pipelineGroup);
  }

  create() {
    try {
      this.clear();
      
      const stages = STAGE_CONFIG.STAGES;
      const stagePositions = STAGE_CONFIG.STAGE_POSITIONS;
      const capacities = stages.map(stage => this.businessData[stage]);
      
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
      // Calculate pipe radius based on capacity
      const normalizedCapacity = (capacity - PIPELINE_CONFIG.MIN_POSSIBLE_CAPACITY) / 
                                 (PIPELINE_CONFIG.MAX_POSSIBLE_CAPACITY - PIPELINE_CONFIG.MIN_POSSIBLE_CAPACITY);
      const radius = PIPELINE_CONFIG.MIN_RADIUS + (normalizedCapacity * (PIPELINE_CONFIG.MAX_RADIUS - PIPELINE_CONFIG.MIN_RADIUS));
      
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
      
      // Create water flow if simulation is running
      if (this.isSimulating) {
        this.createWaterFlow(position, radius);
      }
    } catch (error) {
      console.error(`Error creating pipe stage ${stage}:`, error);
    }
  }

  createPipeMaterial(stage, index, bottleneckIndex) {
    let color;
    
    if (index === bottleneckIndex && this.currentScenario === 'current') {
      color = MATERIAL_COLORS.BOTTLENECK; // Red for bottleneck
    } else if (this.currentScenario === 'optimized' && stage === 'onboarding') {
      color = MATERIAL_COLORS.OPTIMIZED; // Green for optimized
    } else {
      color = MATERIAL_COLORS.NORMAL; // Normal metallic
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
    
    this.pipes = [];
    this.waterFlows = [];
    this.connectors = [];
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
      // Apply realistic coaching automation improvement
      this.businessData.onboarding = 75; // 3x improvement
    } else if (scenario === 'current') {
      // Reset to original bottleneck
      this.businessData.onboarding = 25;
    }
    
    return this.create(); // Recreate with new scenario
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