import React, { useRef, useEffect, useState, useCallback } from 'react';

const ParticleBackground = ({ imageUrl }) => {
    const canvasRef = useRef(null);
    const particlesRef = useRef([]);
    const mouseRef = useRef({ x: -1000, y: -1000 });
    const animationRef = useRef(null);

    // 粒子类
    class Particle {
        constructor(x, y, color, originX, originY) {
            this.x = x;
            this.y = y;
            this.originX = originX;
            this.originY = originY;
            this.color = color;
            this.size = 2;
            this.baseSize = 2;
            this.density = (Math.random() * 30) + 1;
            this.vx = 0;
            this.vy = 0;
        }

        update(mouse, canvas) {
            // 计算与鼠标的距离
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = 120;
            
            // 鼠标交互 - 粒子躲避鼠标
            if (distance < maxDistance) {
                const force = (maxDistance - distance) / maxDistance;
                const angle = Math.atan2(dy, dx);
                const pushX = Math.cos(angle) * force * this.density * 0.5;
                const pushY = Math.sin(angle) * force * this.density * 0.5;
                
                this.vx -= pushX;
                this.vy -= pushY;
                this.size = this.baseSize + force * 2;
            } else {
                this.size = this.baseSize;
            }
            
            // 回归原位的力
            const homeX = this.originX - this.x;
            const homeY = this.originY - this.y;
            this.vx += homeX * 0.03;
            this.vy += homeY * 0.03;
            
            // 摩擦力
            this.vx *= 0.92;
            this.vy *= 0.92;
            
            // 更新位置
            this.x += this.vx;
            this.y += this.vy;
        }

        draw(ctx) {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // 从图片创建粒子
    const createParticlesFromImage = useCallback((img, canvas) => {
        const ctx = canvas.getContext('2d');
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        // 计算图片在画布中的尺寸和位置（居中显示）
        const maxWidth = canvas.width * 0.6;
        const maxHeight = canvas.height * 0.6;
        const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
        const imgWidth = img.width * scale;
        const imgHeight = img.height * scale;
        const offsetX = (canvas.width - imgWidth) / 2;
        const offsetY = (canvas.height - imgHeight) / 2;
        
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        tempCtx.drawImage(img, 0, 0);
        
        const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
        const pixels = imageData.data;
        
        const particles = [];
        const gap = 4; // 采样间隔，越小粒子越多
        
        for (let y = 0; y < img.height; y += gap) {
            for (let x = 0; x < img.width; x += gap) {
                const i = (y * img.width + x) * 4;
                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];
                const a = pixels[i + 3];
                
                // 跳过透明像素和接近白色的像素
                if (a < 128) continue;
                if (r > 240 && g > 240 && b > 240) continue;
                
                const color = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
                const px = offsetX + x * scale;
                const py = offsetY + y * scale;
                
                particles.push(new Particle(px, py, color, px, py));
            }
        }
        
        return particles;
    }, []);

    // 创建默认粒子（无图片时）
    const createDefaultParticles = useCallback((canvas) => {
        const particles = [];
        const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe'];
        
        for (let i = 0; i < 150; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const color = colors[Math.floor(Math.random() * colors.length)];
            particles.push(new Particle(x, y, color, x, y));
        }
        
        return particles;
    }, []);

    // 动画循环
    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 绘制半透明背景
        ctx.fillStyle = 'rgba(102, 126, 234, 0.03)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        particlesRef.current.forEach(particle => {
            particle.update(mouseRef.current, canvas);
            particle.draw(ctx);
        });
        
        animationRef.current = requestAnimationFrame(animate);
    }, []);

    // 初始化
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            // 重新初始化粒子
            if (imageUrl) {
                const img = new Image();
                img.onload = () => {
                    console.log('✅ 背景图片加载成功:', imageUrl);
                    particlesRef.current = createParticlesFromImage(img, canvas);
                };
                img.onerror = (e) => {
                    console.error('❌ 背景图片加载失败:', imageUrl, e);
                    particlesRef.current = createDefaultParticles(canvas);
                };
                img.src = imageUrl;
            } else {
                particlesRef.current = createDefaultParticles(canvas);
            }
        };
        
        resize();
        window.addEventListener('resize', resize);
        
        // 鼠标移动
        const handleMouseMove = (e) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };
        
        const handleMouseLeave = () => {
            mouseRef.current = { x: -1000, y: -1000 };
        };
        
        // 触摸支持
        const handleTouchMove = (e) => {
            if (e.touches.length > 0) {
                mouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        };
        
        const handleTouchEnd = () => {
            mouseRef.current = { x: -1000, y: -1000 };
        };
        
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseleave', handleMouseLeave);
        canvas.addEventListener('touchmove', handleTouchMove);
        canvas.addEventListener('touchend', handleTouchEnd);
        
        // 开始动画
        animate();
        
        return () => {
            window.removeEventListener('resize', resize);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseleave', handleMouseLeave);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [imageUrl, createParticlesFromImage, createDefaultParticles, animate]);

    // 图片加载
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !imageUrl) return;
        
        const img = new Image();
        img.onload = () => {
            particlesRef.current = createParticlesFromImage(img, canvas);
        };
        img.onerror = () => {
            console.error('❌ 图片加载失败，使用默认粒子');
            particlesRef.current = createDefaultParticles(canvas);
        };
        img.src = imageUrl;
    }, [imageUrl, createParticlesFromImage, createDefaultParticles]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
        />
    );
};

export default ParticleBackground;
