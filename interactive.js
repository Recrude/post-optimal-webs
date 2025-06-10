// Matter.js 모듈 참조
const { Engine, World, Bodies, Body, Mouse, MouseConstraint, Events, Composite } = Matter;

// p5.js 인스턴스와 Matter.js 엔진을 관리할 객체
const interactiveView = {
    // p5 인스턴스
    p5: null,

    // Matter.js
    engine: null,
    world: null,
    mouseConstraint: null,
    mouseAttractor: null, // 마우스 어트랙터 추가
    
    // DOM 요소
    tooltip: null,
    shakeButton: null,
    
    // 데이터 및 노드
    nodes: [],
    nodeMap: new Map(),
    
    // 상태
    isInitialized: false,
    isLooping: false,
    
    // 설정
    frameRadius: 0,
    frameCenter: { x: 0, y: 0 },
    suisseFont: null,

    // 흔들기 관련 변수
    isShaking: false,
    shakeIntensity: 0,
    shakeDecay: 0.97,
    shakeDuration: 0,
    shakeDirection: { x: 0, y: 0 },

    // 카테고리별 색상 매핑
    categoryNodeColors: {
        '사회적 비판과 거버넌스': [179, 204, 226],
        '기술 윤리와 미래 시나리오': [255, 238, 173],
        '디지털 정체성과 문화': [255, 179, 179],
        '환경·경제 시스템 탐구': [255, 255, 255],
        '실험적 인터페이스와 데이터 경험': [255, 204, 179],
        '디지털 유산과 역사성': [179, 226, 179],
        '분류 없음': [220, 220, 220]
    },

    // 초기화 함수
    init(data) {
        if (this.isInitialized) return;
        
        // p5.js 인스턴스 생성
        this.p5 = new p5(sketch => {
            sketch.preload = () => this.preload(sketch);
            sketch.setup = () => this.setup(sketch, data);
            sketch.draw = () => this.draw(sketch);
            sketch.windowResized = () => this.windowResized(sketch);
            sketch.mouseMoved = () => this.mouseMoved(sketch);
            sketch.mouseClicked = () => this.mouseClicked(sketch);
        }, 'p5Canvas');

        this.isInitialized = true;
    },

    preload(sketch) {
        const fontPath = '/fonts/SuisseIntlMono-Regular-WebS.woff';
        this.suisseFont = sketch.loadFont(fontPath);
    },
    
    setup(sketch, data) {
        sketch.createCanvas(sketch.windowWidth, sketch.windowHeight);
        
        this.tooltip = document.getElementById('tooltip');
        this.shakeButton = document.getElementById('shake-button');
        if (this.shakeButton) this.shakeButton.addEventListener('click', () => this.startShaking());

        this.frameRadius = Math.min(sketch.windowWidth, sketch.windowHeight) * 0.45;
        this.frameCenter = { x: sketch.windowWidth / 2, y: sketch.windowHeight / 2 };

        this.engine = Engine.create();
        this.world = this.engine.world;
        this.engine.world.gravity.y = 0;

        this.createCircleFrame();
        this.processNodeData(data);
        this.setupMouseInteraction(sketch);
        
        sketch.frameRate(60);
        this.isLooping = true;
    },

    draw(sketch) {
        if (!this.isLooping) return;
        sketch.clear(); // 배경을 투명하게 만듭니다.
        Engine.update(this.engine);
        this.applyMouseAttraction(); // 마우스 어트랙션 적용
        this.updateShaking();
        this.drawNodes(sketch);
    },

    startShaking() {
        if (this.isShaking && this.shakeDuration > 0) {
            this.shakeIntensity = Math.min(this.shakeIntensity + 3, 10);
        } else {
            this.isShaking = true;
            this.shakeIntensity = 5;
            this.shakeDuration = 90;
            this.updateShakeDirection();
            this.applyShakeForce();
        }
    },
    
    updateShakeDirection() {
        this.shakeDirection = { x: this.p5.random(-1, 1), y: this.p5.random(-1, 1) };
        const mag = this.p5.mag(this.shakeDirection.x, this.shakeDirection.y);
        if (mag > 0) {
            this.shakeDirection.x /= mag;
            this.shakeDirection.y /= mag;
        }
    },

    applyShakeForce() {
        for (const body of this.nodeMap.values()) {
            const forceX = this.shakeDirection.x * this.shakeIntensity * body.mass * 0.03;
            const forceY = this.shakeDirection.y * this.shakeIntensity * body.mass * 0.03;
            Body.applyForce(body, body.position, { x: forceX, y: forceY });
        }
    },

    updateShaking() {
        if (!this.isShaking) return;
        this.shakeDuration--;
        if (this.shakeDuration % 15 === 0) {
            this.updateShakeDirection();
            this.applyShakeForce();
        }
        this.shakeIntensity *= this.shakeDecay;
        if (this.shakeIntensity < 0.1 || this.shakeDuration <= 0) {
            this.isShaking = false;
        }
    },
    
    createCircleFrame() {
        const segments = 64;
        const frameThickness = 50;
        const frameRadius = this.frameRadius + frameThickness / 2;
        const frame = Body.create({
            isStatic: true,
            restitution: 0.9,
            friction: 0.1
        });
        const parts = [];
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = this.frameCenter.x + frameRadius * Math.cos(angle);
            const y = this.frameCenter.y + frameRadius * Math.sin(angle);
            const segment = Bodies.rectangle(x, y, 20, frameThickness, {
                isStatic: true,
                angle: angle + Math.PI / 2,
                restitution: 0.9,
                friction: 0.1,
            });
            parts.push(segment);
        }
        Body.setParts(frame, parts);
        World.add(this.world, frame);
    },

    processNodeData(data) {
        if (!data) return;
        this.nodes = data.map((row, index) => {
            if (row.length < 4) return null;
            return {
                id: `node-${index}`,
                category: row[0]?.trim() || '분류 없음',
                title: row[1]?.trim() || '제목 없음',
                url: row[2]?.trim() || '#',
                description: row[3]?.trim() || '설명 없음',
                initialTextAngleOffset: this.p5.random(this.p5.TWO_PI) // 텍스트 회전각 추가
            };
        }).filter(Boolean);
        this.createMatterNodes(this.nodes);
    },
    
    createMatterNodes(nodeData) {
        World.clear(this.world, false);
        this.nodeMap.clear();
        this.createCircleFrame();

        nodeData.forEach(node => {
            const STANDARD_NODE_SIZE = 80;
            const angle = this.p5.random(this.p5.TWO_PI);
            const distance = this.p5.random(0, this.frameRadius * 0.6);
            const x = this.frameCenter.x + this.p5.cos(angle) * distance;
            const y = this.frameCenter.y + this.p5.sin(angle) * distance;
            
            const body = Bodies.circle(x, y, STANDARD_NODE_SIZE / 2, {
                restitution: 0.7,
                friction: 0.005,
                frictionAir: 0.001,
                collisionFilter: { group: -1 }, // 노드끼리 충돌하지 않도록 설정
                label: node.id
            });
            
            // 초기 움직임을 위한 힘 적용
            const forceMagnitude = 0.0005 * body.mass;
            Body.applyForce(body, body.position, {
                x: this.p5.random(-forceMagnitude, forceMagnitude),
                y: this.p5.random(-forceMagnitude, forceMagnitude)
            });

            this.nodeMap.set(node.id, body);
        });
        World.add(this.world, [...this.nodeMap.values()]);
    },

    setupMouseInteraction(sketch) {
        const mouse = Mouse.create(sketch.canvas.elt);
        mouse.pixelRatio = sketch.pixelDensity();
        this.mouseConstraint = MouseConstraint.create(this.engine, {
            mouse: mouse,
            constraint: { stiffness: 0.2, render: { visible: false } }
        });
        World.add(this.world, this.mouseConstraint);
        
        // 마우스 어트랙터 설정
        Events.on(this.engine, 'beforeUpdate', () => {
            if (!this.mouseConstraint.mouse.position) return;
            const mousePos = this.mouseConstraint.mouse.position;
            const distance = this.p5.dist(mousePos.x, mousePos.y, this.frameCenter.x, this.frameCenter.y);

            if (distance <= this.frameRadius) {
                if (!this.mouseAttractor) {
                    this.mouseAttractor = Body.create({ isStatic: true });
                    // World.add(this.world, this.mouseAttractor); // 실제로 월드에 추가할 필요 없음
                }
                Body.setPosition(this.mouseAttractor, mousePos);
            } else {
                this.mouseAttractor = null;
            }
        });
    },
    
    applyMouseAttraction() {
        if (!this.mouseAttractor) return;
        for (const body of this.nodeMap.values()) {
            const dx = this.mouseAttractor.position.x - body.position.x;
            const dy = this.mouseAttractor.position.y - body.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 150 && distance > 0) {
                const forceMagnitude = 0.00001 * body.mass * (1 - distance / 150);
                Body.applyForce(body, body.position, {
                    x: dx * forceMagnitude,
                    y: dy * forceMagnitude
                });
            }
        }
    },
    
    mouseMoved(sketch) {
        const mousePos = { x: sketch.mouseX, y: sketch.mouseY };
        let hoveredNode = null;
        for (const node of this.nodes) {
            const body = this.nodeMap.get(node.id);
            if (body && this.p5.dist(mousePos.x, mousePos.y, body.position.x, body.position.y) < body.circleRadius) {
                hoveredNode = node;
                break;
            }
        }
        if (hoveredNode) {
            this.tooltip.innerHTML = `<strong>${hoveredNode.title}</strong><br>${hoveredNode.description.substring(0, 100)}...`;
            this.tooltip.style.opacity = '1';
            this.tooltip.style.left = `${sketch.mouseX + 15}px`;
            this.tooltip.style.top = `${sketch.mouseY + 15}px`;
        } else {
            this.tooltip.style.opacity = '0';
        }
    },
    
    mouseClicked(sketch) {
        const mousePos = { x: sketch.mouseX, y: sketch.mouseY };
        for (const node of this.nodes) {
            const body = this.nodeMap.get(node.id);
            if (body && this.p5.dist(mousePos.x, mousePos.y, body.position.x, body.position.y) < body.circleRadius) {
                if (node.url && node.url !== '#') {
                    window.open(node.url, '_blank');
                }
                break;
            }
        }
    },
    
    drawNodes(sketch) {
        sketch.textFont(this.suisseFont);
        for (const node of this.nodes) {
            const body = this.nodeMap.get(node.id);
            if (body) {
                const pos = body.position;
                const radius = body.circleRadius;
                const categoryColor = this.categoryNodeColors[node.category] || [220, 220, 220];

                // 노드 원 그리기
                sketch.fill(categoryColor);
                sketch.noStroke();
                sketch.ellipse(pos.x, pos.y, radius * 2, radius * 2);
                
                // 원형 텍스트 그리기
                sketch.push();
                sketch.translate(pos.x, pos.y);
                
                const title = node.title;
                const textRadius = radius * 0.8;
                let characterSpacingAngle = 0.22;
                let totalAngle = title.length * characterSpacingAngle;
                
                if (totalAngle > Math.PI * 1.9) {
                    characterSpacingAngle = (Math.PI * 1.9) / title.length;
                    totalAngle = Math.PI * 1.9;
                }
                
                const startAngle = (node.initialTextAngleOffset || 0) - sketch.PI / 2 - totalAngle / 2;
                const brightness = (categoryColor[0] * 299 + categoryColor[1] * 587 + categoryColor[2] * 114) / 1000;
                const textColor = brightness > 128 ? 0 : 255;
                
                sketch.fill(textColor);
                sketch.textSize(radius * 0.24);
                sketch.textAlign(sketch.CENTER, sketch.CENTER);

                for (let i = 0; i < title.length; i++) {
                    const char = title[i];
                    const angle = startAngle + (i * characterSpacingAngle) + (characterSpacingAngle / 2);
                    const charX = textRadius * Math.cos(angle);
                    const charY = textRadius * Math.sin(angle);
                    sketch.push();
                    sketch.translate(charX, charY);
                    sketch.rotate(angle + sketch.PI / 2);
                    sketch.text(char, 0, 0);
                    sketch.pop();
                }
                sketch.pop();
            }
        }
    },
    
    // 외부에서 호출될 제어 함수
    start(data) {
        this.init(data);
    },
    stop() {
        if (this.p5 && this.isLooping) {
            this.p5.noLoop();
            this.isLooping = false;
        }
    },
    resume() {
        if (this.p5 && !this.isLooping) {
            this.p5.loop();
            this.isLooping = true;
        }
    },
    windowResized(sketch) {
        sketch.resizeCanvas(sketch.windowWidth, sketch.windowHeight);
        this.frameRadius = Math.min(sketch.windowWidth, sketch.windowHeight) * 0.45;
        this.frameCenter = { x: sketch.windowWidth / 2, y: sketch.windowHeight / 2 };
        this.createMatterNodes(this.nodes);
    }
};

// script.js에서 호출할 전역 함수
function startInteractiveView(data) {
    interactiveView.start(data);
}

function stopInteractiveView() {
    interactiveView.stop();
}

function resumeInteractiveView() {
    interactiveView.resume();
} 