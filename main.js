// Global error handler for better debugging
window.addEventListener('error', function(event) {
    console.error('Error details:', {
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        error: event.error
    });
});

// Wrap in try-catch for initialization
try {
    console.log('Starting AutomatedBots Pipeline Analyzer initialization...');

    // Coaching/Consulting Industry Realistic Defaults
    let businessData = {
        leadGen: 120,        // leads/month - typical coaching business
        qualification: 45,   // qualified prospects/month - 38% qualification rate
        onboarding: 25,      // new clients/month - typical bottleneck
        delivery: 60,        // client capacity/month
        retention: 35        // retained clients/month
    };

    let currentScenario = 'current';
    let selectedProcess = 'overview';
    let isSimulating = false;

    // Three.js variables
    let scene, camera, renderer, pipelineGroup;
    let pipes = [];
    let waterFlows = [];
    let labels = [];
    let thoughtBubbles = []; // Store thought bubble references

    // Camera positions for different views
    const cameraPositions = {
        overview: { x: 0, y: 8, z: 15, lookAt: { x: 0, y: 0, z: 0 } },
        leadGen: { x: -6, y: 2, z: 5, lookAt: { x: -6, y: 0, z: 0 } },
        qualification: { x: -3, y: 2, z: 5, lookAt: { x: -3, y: 0, z: 0 } },
        onboarding: { x: 0, y: 2, z: 5, lookAt: { x: 0, y: 0, z: 0 } },
        delivery: { x: 3, y: 2, z: 5, lookAt: { x: 3, y: 0, z: 0 } },
        retention: { x: 6, y: 2, z: 5, lookAt: { x: 6, y: 0, z: 0 } }
    };

    // Thought bubble content for each process
    const thoughtBubbleContent = {
        leadGen: {
            title: "🎯 Marketing Automations",
            previews: [
                { icon: "📧", text: "Email nurture sequences" },
                { icon: "🤖", text: "Lead scoring bot" },
                { icon: "📱", text: "Social media scheduler" }
            ]
        },
        qualification: {
            title: "📞 Sales Automations",
            previews: [
                { icon: "💬", text: "Qualification chatbot" },
                { icon: "📅", text: "Auto-booking system" },
                { icon: "📧", text: "Follow-up sequences" }
            ]
        },
        onboarding: {
            title: "🚨 Critical Bottleneck!",
            previews: [
                { icon: "📝", text: "Automated intake forms" },
                { icon: "📂", text: "Document collection" },
                { icon: "🎉", text: "Welcome automation" }
            ]
        },
        delivery: {
            title: "⚡ Fulfillment Tools",
            previews: [
                { icon: "📅", text: "Session scheduling" },
                { icon: "📊", text: "Progress tracking" },
                { icon: "📚", text: "Resource delivery" }
            ]
        },
        retention: {
            title: "🔄 Retention Systems",
            previews: [
                { icon: "✅", text: "Success check-ins" },
                { icon: "🔔", text: "Renewal campaigns" },
                { icon: "⭐", text: "Feedback automation" }
            ]
        }
    };

    // Process-specific automation data
    const processAutomations = {
        overview: {
            title: "Business Process Overview",
            description: "Click any process above to zoom into specific automation opportunities",
            automations: [
                {
                    title: "Automated Client Onboarding System",
                    description: "Replace manual intake with AI-powered onboarding flows. Typical coaching businesses see 3x capacity increase.",
                    impact: "+200% Capacity → $150K Revenue",
                    priority: true
                },
                {
                    title: "Lead Scoring & Qualification Bot", 
                    description: "AI chatbot qualifies prospects automatically. Coaching businesses reduce unqualified calls by 60%.",
                    impact: "+50% Qualified Leads → $45K Revenue",
                    priority: false
                },
                {
                    title: "Client Success & Retention Automation",
                    description: "Automated check-ins, progress tracking, and renewal campaigns. Industry benchmark: 35% retention improvement.",
                    impact: "+35% Retention → $36K Revenue", 
                    priority: false
                }
            ]
        },
        leadGen: {
            title: "Marketing Process Analysis",
            description: "Your marketing generates good lead volume. Consider optimizing after fixing your onboarding bottleneck.",
            status: "optimization",
            statusText: "⚡ OPTIMIZATION OPPORTUNITY",
            capacity: 120,
            unit: "leads/month",
            automations: [
                {
                    title: "Lead Magnet Automation System",
                    description: "Automated lead magnet delivery, email sequences, and lead scoring integration.",
                    impact: "40% more qualified leads",
                    priority: false
                },
                {
                    title: "Social Media Content Scheduler",
                    description: "AI-powered content creation and scheduling across all platforms with engagement tracking.",
                    impact: "Save 10 hours/week",
                    priority: false
                },
                {
                    title: "Email Nurture Sequences",
                    description: "Automated email campaigns based on lead behavior and engagement patterns.",
                    impact: "25% increase in conversion",
                    priority: false
                }
            ]
        },
        qualification: {
            title: "Sales Process Analysis", 
            description: "Your qualification process is performing well but could be optimized for efficiency.",
            status: "secondary",
            statusText: "📞 SECONDARY OPTIMIZATION",
            capacity: 45,
            unit: "qualified prospects/month",
            automations: [
                {
                    title: "Lead Qualification Chatbot",
                    description: "AI chatbot pre-qualifies leads before they book discovery calls, saving you time.",
                    impact: "60% fewer unqualified calls",
                    priority: false
                },
                {
                    title: "Automated Follow-up Sequences",
                    description: "Smart follow-up campaigns for prospects who don't book initially.",
                    impact: "30% more bookings",
                    priority: false
                },
                {
                    title: "Discovery Call Booking System",
                    description: "Automated calendar booking with pre-call questionnaires and reminder sequences.",
                    impact: "Reduce no-shows by 40%",
                    priority: false
                }
            ]
        },
        onboarding: {
            title: "Onboarding Process Analysis",
            description: "BOTTLENECK DETECTED! Your onboarding can only handle 25 clients/month. This is limiting your entire business to $75K ARR.",
            status: "bottleneck", 
            statusText: "🚨 CRITICAL CONSTRAINT - Start Here!",
            capacity: 25,
            unit: "new clients/month",
            automations: [
                {
                    title: "Automated Client Intake System",
                    description: "Complete intake automation including forms, document collection, and initial setup. This is your highest ROI opportunity.",
                    impact: "3x capacity increase → $150K+ ARR",
                    priority: true
                },
                {
                    title: "Document Collection Workflow",
                    description: "Automated document requests, reminders, and organization system.",
                    impact: "Save 5 hours per client",
                    priority: true
                },
                {
                    title: "Welcome Sequence Automation",
                    description: "Automated welcome emails, expectation setting, and first session scheduling.",
                    impact: "Reduce onboarding time by 70%",
                    priority: true
                }
            ]
        },
        delivery: {
            title: "Service Delivery Analysis",
            description: "Your delivery capacity is strong. Focus on onboarding optimization first for maximum impact.",
            status: "optimization",
            statusText: "⚡ GOOD CAPACITY",
            capacity: 60,
            unit: "client capacity/month",
            automations: [
                {
                    title: "Session Scheduling Automation", 
                    description: "Smart scheduling system with automatic reminders and rescheduling capabilities.",
                    impact: "Reduce scheduling time by 80%",
                    priority: false
                },
                {
                    title: "Progress Tracking System",
                    description: "Automated client progress tracking with milestone alerts and reporting.",
                    impact: "Better client outcomes",
                    priority: false
                },
                {
                    title: "Resource Delivery Automation",
                    description: "Automated delivery of coaching resources, worksheets, and action items.",
                    impact: "Save 3 hours/week",
                    priority: false
                }
            ]
        },
        retention: {
            title: "Client Retention Analysis",
            description: "Your retention needs improvement. Address after fixing the onboarding bottleneck.",
            status: "secondary",
            statusText: "📈 NEEDS IMPROVEMENT",
            capacity: 35,
            unit: "retained clients/month", 
            automations: [
                {
                    title: "Client Success Automation",
                    description: "Automated check-ins, progress celebrations, and early warning system for at-risk clients.",
                    impact: "35% retention improvement",
                    priority: false
                },
                {
                    title: "Renewal Campaign System",
                    description: "Automated renewal reminders, success showcases, and upgrade offers.",
                    impact: "25% more renewals",
                    priority: false
                },
                {
                    title: "Feedback Collection Automation",
                    description: "Automated feedback requests, testimonial collection, and satisfaction tracking.",
                    impact: "Improve service quality",
                    priority: false
                }
            ]
        }
    };

    // Initialize Three.js scene
    function initializeThreeJS() {
        try {
            console.log('Initializing Three.js...');
            const canvas = document.getElementById('pipelineCanvas');
            const container = document.querySelector('.pipeline-container');
            
            if (!canvas || !container) {
                throw new Error('Required DOM elements not found');
            }
            
            // Scene setup
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0xf8f9fa);
            
            // Camera setup
            camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
            camera.position.set(0, 8, 15);
            camera.lookAt(0, 0, 0);
            
            // Renderer setup
            renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
            renderer.setSize(container.clientWidth, container.clientHeight);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            
            // Create container for thought bubbles
            const bubblesContainer = document.createElement('div');
            bubblesContainer.className = 'css2d-container';
            container.appendChild(bubblesContainer);
            
            // Lighting
            const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
            scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(10, 10, 5);
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 2048;
            directionalLight.shadow.mapSize.height = 2048;
            scene.add(directionalLight);
            
            // Pipeline group
            pipelineGroup = new THREE.Group();
            scene.add(pipelineGroup);
            
            console.log('Three.js scene created successfully');
            
            // Create initial pipeline
            createPipeline();
            
            // Animation loop
            animate();
            
            // Handle window resize
            window.addEventListener('resize', onWindowResize);
            
            // Hide loading overlay
            document.getElementById('loadingOverlay').style.display = 'none';
            
            console.log('Three.js initialization complete');
        } catch (error) {
            console.error('Error in initializeThreeJS:', error);
            document.getElementById('loadingOverlay').textContent = 'Error loading 3D scene: ' + error.message;
        }
    }

    function createThoughtBubble(stage, position) {
        try {
            const content = thoughtBubbleContent[stage];
            if (!content) return null;

            const bubbleDiv = document.createElement('div');
            bubbleDiv.className = 'thought-bubble';
            bubbleDiv.id = `thought-bubble-${stage}`;
            bubbleDiv.style.position = 'absolute';
            bubbleDiv.style.display = 'none';
            
            // Add click handler to dismiss bubble
            bubbleDiv.addEventListener('click', function(e) {
                if (e.target.closest('.bubble-cta')) return; // Don't dismiss if clicking CTA
                this.classList.remove('visible');
            });
            
            const previewsHTML = content.previews.map(preview => `
                <div class="automation-preview">
                    <span class="automation-icon">${preview.icon}</span>
                    <span class="automation-text">${preview.text}</span>
                </div>
            `).join('');
            
            bubbleDiv.innerHTML = `
                <div class="thought-bubble-content">
                    <h4>${content.title}</h4>
                    <div class="preview-items">
                        ${previewsHTML}
                    </div>
                    <div class="bubble-cta" onclick="window.scrollToAutomations()">
                        <span>See full roadmap</span>
                        <span class="arrow">↓</span>
                    </div>
                </div>
                <div class="bubble-tail"></div>
            `;
            
            // Add to container
            const container = document.querySelector('.css2d-container');
            if (container) {
                container.appendChild(bubbleDiv);
            }
            
            return bubbleDiv;
        } catch (error) {
            console.error('Error creating thought bubble:', error);
            return null;
        }
    }

    function updateBubblePosition(bubbleDiv, worldPosition) {
        if (!bubbleDiv || !camera) return;
        
        const container = document.querySelector('.pipeline-container');
        if (!container) return;
        
        const vector = new THREE.Vector3();
        vector.copy(worldPosition);
        vector.project(camera);
        
        const x = (vector.x * 0.5 + 0.5) * container.clientWidth;
        const y = (-(vector.y * 0.5) + 0.5) * container.clientHeight;
        
        // Calculate distance-based offset for better positioning at different zoom levels
        const distance = camera.position.distanceTo(worldPosition);
        const offsetY = Math.max(15, Math.min(60, distance * 6)); // Scale offset based on distance
        
        bubbleDiv.style.left = `${x}px`;
        bubbleDiv.style.top = `${y - offsetY}px`;
        bubbleDiv.style.transform = 'translate(-50%, -100%)';
    }

    window.scrollToAutomations = function() {
        const processAnalysis = document.getElementById('processAnalysis');
        processAnalysis.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function createPipeline() {
        try {
            console.log('Creating pipeline...');
            
            // Clear existing pipeline
            pipes.forEach(pipe => pipelineGroup.remove(pipe));
            waterFlows.forEach(water => pipelineGroup.remove(water));
            
            // Clear existing thought bubbles
            const bubblesContainer = document.querySelector('.css2d-container');
            if (bubblesContainer) {
                bubblesContainer.innerHTML = '';
            }
            thoughtBubbles = [];
            
            pipes = [];
            waterFlows = [];
            
            const stages = ['leadGen', 'qualification', 'onboarding', 'delivery', 'retention'];
            const stagePositions = [-6, -3, 0, 3, 6];
            const capacities = stages.map(stage => businessData[stage]);
            
            // Find bottleneck
            const minCapacity = Math.min(...capacities);
            const maxCapacity = Math.max(...capacities);
            const bottleneckIndex = capacities.indexOf(minCapacity);
            
            stages.forEach((stage, index) => {
                try {
                    const capacity = capacities[index];
                    const position = stagePositions[index];
                    
                    // Calculate pipe radius based on capacity
                    const normalizedCapacity = (capacity - minCapacity) / (maxCapacity - minCapacity || 1);
                    const radius = 0.3 + (normalizedCapacity * 0.7); // 0.3 to 1.0 radius
                    
                    // Pipe geometry and material
                    const pipeGeometry = new THREE.CylinderGeometry(radius, radius, 2, 16);
                    
                    let pipeMaterial;
                    if (index === bottleneckIndex && currentScenario === 'current') {
                        // Bottleneck - red material
                        pipeMaterial = new THREE.MeshLambertMaterial({ 
                            color: 0xff4444,
                            transparent: true,
                            opacity: 0.9
                        });
                    } else if (currentScenario === 'optimized' && stage === 'onboarding') {
                        // Optimized - green material
                        pipeMaterial = new THREE.MeshLambertMaterial({ 
                            color: 0x40c057,
                            transparent: true,
                            opacity: 0.9
                        });
                    } else {
                        // Normal - metallic material
                        pipeMaterial = new THREE.MeshLambertMaterial({ 
                            color: 0xc0c0c0,
                            transparent: true,
                            opacity: 0.8
                        });
                    }
                    
                    const pipe = new THREE.Mesh(pipeGeometry, pipeMaterial);
                    pipe.position.set(position, 0, 0);
                    pipe.rotation.z = Math.PI / 2; // Rotate to horizontal
                    pipe.castShadow = true;
                    pipe.receiveShadow = true;
                    pipe.userData = { stage: stage, capacity: capacity };
                    
                    pipelineGroup.add(pipe);
                    pipes.push(pipe);
                    
                    // Create thought bubble for this stage
                    const worldPos = new THREE.Vector3(position, 0.8 + radius, 0);
                    const bubbleDiv = createThoughtBubble(stage, worldPos);
                    if (bubbleDiv) {
                        thoughtBubbles.push({
                            element: bubbleDiv,
                            worldPosition: worldPos,
                            stage: stage
                        });
                        // Set initial position
                        updateBubblePosition(bubbleDiv, worldPos);
                    }
                    
                    // Connectors between pipes
                    if (index < stages.length - 1) {
                        const connectorGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1.5, 8);
                        const connectorMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
                        const connector = new THREE.Mesh(connectorGeometry, connectorMaterial);
                        connector.position.set(position + 1.25, 0, 0);
                        connector.rotation.z = Math.PI / 2;
                        connector.castShadow = true;
                        
                        pipelineGroup.add(connector);
                    }
                    
                    // Water flow inside pipe (if simulation is running)
                    if (isSimulating) {
                        const waterGeometry = new THREE.CylinderGeometry(radius * 0.7, radius * 0.7, 1.8, 12);
                        const waterMaterial = new THREE.MeshLambertMaterial({ 
                            color: 0x4a90e2,
                            transparent: true,
                            opacity: 0.6
                        });
                        const water = new THREE.Mesh(waterGeometry, waterMaterial);
                        water.position.set(position, 0, 0);
                        water.rotation.z = Math.PI / 2;
                        
                        pipelineGroup.add(water);
                        waterFlows.push(water);
                        
                        // Animate water flow
                        animateWaterFlow(water, radius);
                    }
                } catch (stageError) {
                    console.error(`Error creating pipeline stage ${stage}:`, stageError);
                }
            });
            
            updateRevenue();
            
            // Set initial bubble positions after a brief delay
            setTimeout(() => {
                thoughtBubbles.forEach(bubble => {
                    updateBubblePosition(bubble.element, bubble.worldPosition);
                });
            }, 100);
            
            console.log('Pipeline created successfully');
        } catch (error) {
            console.error('Error in createPipeline:', error);
        }
    }

    function animateWaterFlow(waterMesh, radius) {
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

    function selectProcess(processId) {
        selectedProcess = processId;
        
        // Update tab states
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        event.target.classList.add('active');
        
        // Hide all thought bubbles
        thoughtBubbles.forEach(bubble => {
            if (bubble.element) {
                bubble.element.classList.remove('visible');
            }
        });
        
        // Animate camera to new position
        animateCamera(processId);
        
        // Show relevant thought bubble after a short delay
        if (processId !== 'overview') {
            setTimeout(() => {
                const bubbleIndex = ['leadGen', 'qualification', 'onboarding', 'delivery', 'retention'].indexOf(processId);
                if (bubbleIndex >= 0 && thoughtBubbles[bubbleIndex]) {
                    thoughtBubbles[bubbleIndex].element.classList.add('visible');
                    
                    // Auto-hide after 7 seconds
                    setTimeout(() => {
                        thoughtBubbles[bubbleIndex].element.classList.remove('visible');
                    }, 7000);
                }
            }, 1000); // Show bubble after 1 second (mid-zoom)
        }
        
        // Update process content
        updateProcessContent(processId);
    }

    // Expose functions to window object for HTML onclick handlers
    window.selectProcessTab = selectProcess;
    window.resetCamera = resetCamera;
    window.toggleSimulation = toggleSimulation;
    window.submitLeadForm = submitLeadForm;
    window.updateStage = updateStage;
    window.updateIndustry = updateIndustry;

    function animateCamera(processId) {
        try {
            console.log('animateCamera called with:', processId);
            const targetPos = cameraPositions[processId];
            if (!targetPos) {
                console.error('No camera position found for:', processId);
                return;
            }
            
            const duration = 2;
            
            // Animate camera position
            gsap.to(camera.position, {
                x: targetPos.x,
                y: targetPos.y, 
                z: targetPos.z,
                duration: duration,
                ease: "power2.inOut"
            });
            
            // Animate camera look-at
            const currentLookAt = new THREE.Vector3();
            camera.getWorldDirection(currentLookAt);
            
            gsap.to(targetPos.lookAt, {
                duration: duration,
                ease: "power2.inOut",
                onUpdate: function() {
                    camera.lookAt(targetPos.lookAt.x, targetPos.lookAt.y, targetPos.lookAt.z);
                }
            });
        } catch (error) {
            console.error('Error in animateCamera:', error);
        }
    }

    function resetCamera() {
        // Hide all thought bubbles
        thoughtBubbles.forEach(bubble => {
            if (bubble.element) {
                bubble.element.classList.remove('visible');
            }
        });
        
        selectedProcess = 'overview';
        animateCamera('overview');
        updateProcessContent('overview');
        
        // Update tab visual state
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelector('.tab[onclick*="overview"]').classList.add('active');
    }

    function updateStage(stage, value) {
        businessData[stage] = parseInt(value);
        
        // Hide all thought bubbles when adjusting sliders
        thoughtBubbles.forEach(bubble => {
            if (bubble.element) {
                bubble.element.classList.remove('visible');
            }
        });
        
        // Update the displayed value
        const valueDisplay = document.getElementById(stage + '-value');
        const units = {
            leadGen: 'leads/month',
            qualification: 'qualified/month', 
            onboarding: 'clients/month',
            delivery: 'capacity/month',
            retention: 'retained/month'
        };
        valueDisplay.textContent = `${value} ${units[stage]}`;
        
        createPipeline(); // Recreate pipeline with new dimensions
        updateBottleneckAlert(); // Update bottleneck alert
    }

    function updateRevenue() {
        const capacities = Object.values(businessData);
        const bottleneckCapacity = Math.min(...capacities);
        
        // Coaching typical client value: $3,000 per client annually
        const revenue = bottleneckCapacity * 3000;
        const formattedRevenue = (revenue / 1000).toFixed(0);
        document.getElementById('revenueDisplay').textContent = `Current Revenue: $${formattedRevenue}K ARR`;
        
        // Update efficiency
        const maxCapacity = Math.max(...capacities);
        const efficiency = Math.round((bottleneckCapacity / maxCapacity) * 100);
        document.getElementById('efficiency').textContent = `${efficiency}%`;
        
        // Update lost revenue
        const potentialRevenue = maxCapacity * 3000;
        const lostRevenue = ((potentialRevenue - revenue) / 1000).toFixed(0);
        document.getElementById('bottleneckImpact').textContent = `$${lostRevenue}K`;
    }

    function updateBottleneckAlert() {
        const stages = ['leadGen', 'qualification', 'onboarding', 'delivery', 'retention'];
        const stageNames = {
            leadGen: 'Lead Generation',
            qualification: 'Qualification', 
            onboarding: 'Onboarding',
            delivery: 'Service Delivery',
            retention: 'Client Retention'
        };
        const capacities = stages.map(stage => businessData[stage]);
        const minCapacity = Math.min(...capacities);
        const bottleneckIndex = capacities.indexOf(minCapacity);
        const bottleneckStage = stages[bottleneckIndex];
        
        const alertElement = document.getElementById('bottleneckAlert');
        alertElement.innerHTML = `🚨 <strong>${stageNames[bottleneckStage]}</strong> is your bottleneck!`;
    }

    function initializeControlValues() {
        const stages = ['leadGen', 'qualification', 'onboarding', 'delivery', 'retention'];
        const units = {
            leadGen: 'leads/month',
            qualification: 'qualified/month', 
            onboarding: 'clients/month',
            delivery: 'capacity/month',
            retention: 'retained/month'
        };
        
        stages.forEach(stage => {
            const valueDisplay = document.getElementById(stage + '-value');
            valueDisplay.textContent = `${businessData[stage]} ${units[stage]}`;
        });
        
        updateBottleneckAlert();
    }

    window.switchScenario = function(scenario) {
        try {
            console.log('switchScenario called with:', scenario);
            currentScenario = scenario;
            
            // Hide all thought bubbles before switching
            thoughtBubbles.forEach(bubble => {
                if (bubble.element) {
                    bubble.element.classList.remove('visible');
                }
            });
            
            // Update toggle button states
            document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
            const clickedBtn = document.querySelector(`.toggle-btn[onclick*="${scenario}"]`);
            if (clickedBtn) {
                clickedBtn.classList.add('active');
            }
            
            if (scenario === 'optimized') {
                // Show realistic coaching automation improvement
                businessData.onboarding = 75; // 3x improvement typical for onboarding automation
                document.querySelector('input[onchange*="onboarding"]').value = 75;
                document.getElementById('onboarding-value').textContent = '75 clients/month';
            } else if (scenario === 'current') {
                // Reset to realistic coaching bottleneck
                businessData.onboarding = 25;
                document.querySelector('input[onchange*="onboarding"]').value = 25;
                document.getElementById('onboarding-value').textContent = '25 clients/month';
            }
            
            createPipeline(); // Recreate with new scenario
            updateBottleneckAlert(); // Update bottleneck alert
            
            // Update process content if specific process is selected
            if (selectedProcess !== 'overview') {
                updateProcessContent(selectedProcess);
            }
        } catch (error) {
            console.error('Error in switchScenario:', error);
        }
    }

    function toggleSimulation() {
        const button = document.querySelector('.play-button');
        isSimulating = !isSimulating;
        button.textContent = isSimulating ? '⏸' : '▶';
        
        // Hide all thought bubbles when toggling simulation
        thoughtBubbles.forEach(bubble => {
            if (bubble.element) {
                bubble.element.classList.remove('visible');
            }
        });
        
        createPipeline(); // Recreate pipeline with/without water flow
    }

    function updateProcessContent(processId) {
        try {
            console.log('updateProcessContent called with:', processId);
            const process = processAutomations[processId];
            if (!process) {
                console.error('No process automation found for:', processId);
                return;
            }
            
            const contentArea = document.getElementById('processAnalysis');
            if (!contentArea) {
                console.error('processAnalysis element not found');
                return;
            }
            
            let statusClass = '';
            let statusIcon = '';
            if (process.status === 'bottleneck') {
                statusClass = 'status-bottleneck';
                statusIcon = '🚨';
            } else if (process.status === 'optimization') {
                statusClass = 'status-optimization'; 
                statusIcon = '⚡';
            } else if (process.status === 'secondary') {
                statusClass = 'status-secondary';
                statusIcon = '📊';
            }
            
            let metricsHTML = '';
            if (process.capacity) {
                const bottleneckCapacity = Math.min(...Object.values(businessData));
                    
                metricsHTML = `
                    <div class="process-metrics">
                        <div class="process-metric">
                            <div class="process-metric-value">${process.capacity}</div>
                            <div class="process-metric-label">${process.unit}</div>
                        </div>
                        <div class="process-metric">
                            <div class="process-metric-value">${process.status === 'bottleneck' ? 'HIGH' : 'LOW'}</div>
                            <div class="process-metric-label">Priority Level</div>
                        </div>
                        <div class="process-metric">
                            <div class="process-metric-value">${process.status === 'bottleneck' ? '$150K+' : '$20-50K'}</div>
                            <div class="process-metric-label">Revenue Impact</div>
                        </div>
                    </div>
                `;
            }
            
            const automationsHTML = process.automations.map(automation => `
                <div class="automation-item ${automation.priority ? 'priority' : ''}" onclick="showAutomationDetails('${automation.title}')">
                    <div class="automation-title">
                        ${automation.title}
                        ${automation.priority ? '<span class="priority-badge">HIGHEST ROI</span>' : ''}
                    </div>
                    <div class="automation-description">${automation.description}</div>
                    <div style="margin-top: 8px; color: #667eea; font-weight: bold; font-size: 0.9rem;">
                        💡 ${automation.impact}
                    </div>
                </div>
            `).join('');
            
            contentArea.innerHTML = `
                <div class="process-header">
                    <div class="process-title">${statusIcon} ${process.title}</div>
                    ${process.statusText ? `<div class="process-status ${statusClass}">${process.statusText}</div>` : ''}
                    <p style="color: #666; max-width: 600px; margin: 0 auto; line-height: 1.5;">${process.description}</p>
                </div>
                
                ${metricsHTML}
                
                <div class="process-automations">
                    <h4>${process.status === 'bottleneck' ? '🎯 Priority Automations - Start Here:' : '⚡ Available Automations:'}</h4>
                    ${automationsHTML}
                </div>
            `;
        } catch (error) {
            console.error('Error in updateProcessContent:', error);
        }
    }

    function showAutomationDetails(title) {
        // Find the automation across all processes
        let automation = null;
        for (const process of Object.values(processAutomations)) {
            automation = process.automations.find(a => a.title === title);
            if (automation) break;
        }
        
        if (automation) {
            alert(`${automation.title}\n\n${automation.description}\n\nExpected Impact: ${automation.impact}\n\nClick "Get My Automation Roadmap" below to receive implementation details!`);
        }
    }

    function updateIndustry(industry) {
        if (industry !== 'coaching') {
            alert('Additional industries coming soon! Sign up below to be notified when SaaS, E-commerce, and Agency templates are available.');
            document.getElementById('industrySelect').value = 'coaching';
        }
    }

    function submitLeadForm() {
        alert("Thank you! Your automation roadmap will be sent to your email within 24 hours. We'll also follow up to schedule your strategy call.");
    }

    function animate() {
        try {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
            
            // Update thought bubble positions only for visible bubbles
            thoughtBubbles.forEach(bubble => {
                if (bubble.element && bubble.element.classList.contains('visible')) {
                    updateBubblePosition(bubble.element, bubble.worldPosition);
                }
            });
        } catch (error) {
            console.error('Error in animate:', error);
            // Still request next frame to keep animation running
            requestAnimationFrame(animate);
        }
    }

    function onWindowResize() {
        const container = document.querySelector('.pipeline-container');
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }

    // Initialize when page loads
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM Content Loaded');
        
        // Check if required libraries are loaded
        if (typeof THREE === 'undefined') {
            console.error('Three.js not loaded!');
            document.getElementById('loadingOverlay').textContent = 'Error: Three.js library failed to load';
            return;
        }
        
        if (typeof gsap === 'undefined') {
            console.error('GSAP not loaded!');
            document.getElementById('loadingOverlay').textContent = 'Error: GSAP library failed to load';
            return;
        }
        
        console.log('Libraries loaded:', { THREE: !!THREE, gsap: !!gsap });
        
        // Small delay to ensure canvas is ready
        setTimeout(() => {
            try {
                initializeThreeJS();
                initializeControlValues(); // Initialize control value displays
                updateProcessContent('overview'); // Start with overview
                console.log('Initialization complete!');
            } catch (initError) {
                console.error('Error during initialization:', initError);
            }
        }, 100);
    });

} catch (globalError) {
    console.error('Global error in script:', globalError);
}
