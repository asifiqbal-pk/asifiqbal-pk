// ===== CONFIGURATION =====
const CONFIG = {
    START_YEAR: 2001,
    TABLET_BREAKPOINT: 991,
    MOBILE_BREAKPOINT: 767,
    AUTO_PLAY_INTERVAL: 7000,
    FORM_SUBMISSION_DELAY: 2000,
    BACK_TO_TOP_THRESHOLD: 300,
    SCROLL_THROTTLE_MS: 100,
    RESIZE_DEBOUNCE_MS: 250,
    REVEAL_THRESHOLD: 0.1,
    TOAST_DURATION: 5000
};

// ===== DOM UTILITIES =====
class DomUtils {
    static $(selector, context = document) {
        return context.querySelector(selector);
    }
    static $$(selector, context = document) {
        return Array.from(context.querySelectorAll(selector));
    }
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    static debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
    static isElementInViewport(el, threshold = 0) {
        const rect = el.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        const windowWidth = window.innerWidth || document.documentElement.clientWidth;
        const vertInView = (rect.top <= windowHeight * (1 - threshold)) && (rect.top + rect.height >= windowHeight * threshold);
        const horInView = (rect.left <= windowWidth) && (rect.left + rect.width >= 0);
        return vertInView && horInView;
    }
    static createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'class' && Array.isArray(value)) {
                element.className = value.join(' ');
            } else if (key === 'style' && typeof value === 'object') {
                Object.entries(value).forEach(([styleKey, styleValue]) => {
                    element.style[styleKey] = styleValue;
                });
            } else if (key.startsWith('on') && typeof value === 'function') {
                element.addEventListener(key.slice(2).toLowerCase(), value);
            } else {
                element.setAttribute(key, value);
            }
        });
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                element.appendChild(child);
            }
        });
        return element;
    }
}

// ===== EXPERIENCE CALCULATOR =====
class ExperienceCalculator {
    static init() {
        const experience = new Date().getFullYear() - CONFIG.START_YEAR;
        DomUtils.$$('#experience, .experience-years').forEach(el => {
            if (el) el.textContent = `${experience}+`;
        });
    }
}

// ===== YEAR SETTER =====
class YearSetter {
    static init() {
        const year = new Date().getFullYear();
        DomUtils.$$('#year, #year-mobile').forEach(el => {
            if (el) el.textContent = year;
        });
    }
}

// ===== SIDEBAR MANAGER =====
class SidebarManager {
    static init() {
        this.sidebar = DomUtils.$('#sidebar');
        this.container = DomUtils.$('.container');
        this.hamburger = DomUtils.$('.hamburger');
        this.toggler = DomUtils.$('#sidebar-toggler');
        this.mobileMenuClose = DomUtils.$('#mobile-menu-close');
        this.mobileMenuOverlay = DomUtils.$('#mobile-menu-overlay');
        this.mobileMenuContainer = DomUtils.$('.mobile-menu-container');
        if (!this.sidebar) return;
        this.bindEvents();
        this.handleResize();
    }
    static bindEvents() {
        this.toggler?.addEventListener('click', () => this.toggleDesktop());
        this.hamburger?.addEventListener('click', () => this.toggleMobile());
        this.mobileMenuClose?.addEventListener('click', () => this.closeMobile());
        this.mobileMenuOverlay?.addEventListener('click', (e) => {
            if (e.target === this.mobileMenuOverlay) this.closeMobile();
        });
        DomUtils.$$('#mobile-menu-overlay .nav-link').forEach(link => {
            link.addEventListener('click', () => this.closeMobile());
        });
        window.addEventListener('resize', DomUtils.debounce(() => this.handleResize(), CONFIG.RESIZE_DEBOUNCE_MS));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeMobile();
        });
    }
    static toggleDesktop() {
        if (window.innerWidth <= CONFIG.TABLET_BREAKPOINT) return;
        this.sidebar.classList.toggle('collapsed');
        this.container?.classList.toggle('collapsed');
        const isNowExpanded = !this.sidebar.classList.contains('collapsed');
        if (this.toggler) this.toggler.setAttribute('aria-expanded', isNowExpanded);
        document.dispatchEvent(new CustomEvent('sidebarToggle', { detail: { collapsed: !isNowExpanded } }));
        this.saveState();
    }
    static handleResize() {
        const isTablet = window.innerWidth <= CONFIG.TABLET_BREAKPOINT && window.innerWidth > CONFIG.MOBILE_BREAKPOINT;
        const isMobile = window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;
        const isDesktop = window.innerWidth > CONFIG.TABLET_BREAKPOINT;
        if (isDesktop) {
            this.closeMobile();
            this.sidebar.style.display = 'flex';
            this.loadState();
        } else if (isTablet) {
            this.closeMobile();
            this.sidebar.style.display = 'flex';
            this.sidebar.classList.add('collapsed');
            this.container?.classList.add('collapsed');
            if (this.toggler) this.toggler.setAttribute('aria-expanded', 'false');
        } else if (isMobile) {
            this.sidebar.style.display = 'none';
        }
    }
    static toggleMobile() {
        const isActive = this.hamburger?.classList.contains('active');
        isActive ? this.closeMobile() : this.openMobile();
    }
    static openMobile() {
        this.hamburger?.classList.add('active');
        this.hamburger?.setAttribute('aria-expanded', 'true');
        this.mobileMenuOverlay?.classList.add('active');
        document.body.style.overflow = 'hidden';
        this.setupFocusTrap();
    }
    static closeMobile() {
        this.hamburger?.classList.remove('active');
        this.hamburger?.setAttribute('aria-expanded', 'false');
        this.mobileMenuOverlay?.classList.remove('active');
        document.body.style.overflow = '';
        this.hamburger?.focus();
    }
    static setupFocusTrap() {
        const focusableElements = DomUtils.$$(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
            this.mobileMenuContainer
        ).filter(el => !el.disabled);
        if (focusableElements.length === 0) return;
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const trapFocus = (e) => {
            if (e.key !== 'Tab') return;
            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };
        this.mobileMenuContainer.addEventListener('keydown', trapFocus);
        firstElement.focus();
    }
    static saveState() {
        if (window.innerWidth <= CONFIG.TABLET_BREAKPOINT) return;
        const isCollapsed = this.sidebar.classList.contains('collapsed');
        try { localStorage.setItem('sidebarCollapsed', isCollapsed); } catch(e) {}
    }
    static loadState() {
        if (window.innerWidth <= CONFIG.TABLET_BREAKPOINT) {
            this.sidebar.classList.add('collapsed');
            return;
        }
        try {
            const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
            if (isCollapsed) {
                this.sidebar.classList.add('collapsed');
                this.container?.classList.add('collapsed');
                if (this.toggler) this.toggler.setAttribute('aria-expanded', 'false');
            } else {
                this.sidebar.classList.remove('collapsed');
                this.container?.classList.remove('collapsed');
                if (this.toggler) this.toggler.setAttribute('aria-expanded', 'true');
            }
        } catch(e) {}
    }
}

// ===== TOOLTIP MANAGER =====
class TooltipManager {
    static init() {
        this.sidebar = DomUtils.$('#sidebar');
        if (!this.sidebar) return;
        this.createTooltip();
        this.setupEventListeners();
        this.updateTooltipBehavior();
        document.addEventListener('sidebarToggle', () => this.updateTooltipBehavior());
        window.addEventListener('resize', DomUtils.debounce(() => this.updateTooltipBehavior(), CONFIG.RESIZE_DEBOUNCE_MS));
    }
    static createTooltip() {
        this.tooltip = DomUtils.createElement('div', {
            id: 'sidebar-tooltip',
            class: ['sidebar-tooltip'],
            'aria-hidden': 'true',
            role: 'tooltip'
        });
        document.body.appendChild(this.tooltip);
    }
    static setupEventListeners() {
        const elements = DomUtils.$$('#sidebar .nav-link, #sidebar .contact-item');
        elements.forEach(element => {
            element.addEventListener('mouseenter', (e) => this.show(e));
            element.addEventListener('mouseleave', () => this.hide());
            element.addEventListener('focus', (e) => this.show(e));
            element.addEventListener('blur', () => this.hide());
            element.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.show(e);
                setTimeout(() => this.hide(), 2000);
            }, { passive: false });
        });
    }
    static updateTooltipBehavior() {
        const isTablet = window.innerWidth <= CONFIG.TABLET_BREAKPOINT && window.innerWidth > CONFIG.MOBILE_BREAKPOINT;
        const isDesktopCollapsed = window.innerWidth > CONFIG.TABLET_BREAKPOINT && this.sidebar.classList.contains('collapsed');
        const shouldShowTooltips = isTablet || isDesktopCollapsed;
        const elements = DomUtils.$$('#sidebar .nav-link, #sidebar .contact-item');
        elements.forEach(el => {
            if (shouldShowTooltips) {
                el.setAttribute('aria-describedby', 'sidebar-tooltip');
            } else {
                el.removeAttribute('aria-describedby');
            }
        });
    }
    static show(event) {
        const isTablet = window.innerWidth <= CONFIG.TABLET_BREAKPOINT && window.innerWidth > CONFIG.MOBILE_BREAKPOINT;
        const isDesktopCollapsed = window.innerWidth > CONFIG.TABLET_BREAKPOINT && this.sidebar.classList.contains('collapsed');
        if (!isTablet && !isDesktopCollapsed) return;
        const target = event.currentTarget;
        const text = this.getTooltipText(target);
        if (!text) return;
        const rect = target.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        this.tooltip.textContent = text;
        const tooltipWidth = this.tooltip.offsetWidth;
        const tooltipHeight = this.tooltip.offsetHeight;
        const viewportWidth = window.innerWidth;
        let top = rect.top + scrollTop + (rect.height / 2) - (tooltipHeight / 2);
        let left = rect.right + scrollLeft + 10;
        if (left + tooltipWidth > viewportWidth - 20) {
            left = rect.left + scrollLeft - tooltipWidth - 10;
            this.tooltip.style.setProperty('--tooltip-arrow-direction', 'right');
        } else {
            this.tooltip.style.setProperty('--tooltip-arrow-direction', 'left');
        }
        if (top < scrollTop + 20) {
            top = scrollTop + 20;
        } else if (top + tooltipHeight > scrollTop + window.innerHeight - 20) {
            top = scrollTop + window.innerHeight - tooltipHeight - 20;
        }
        this.tooltip.style.top = `${top}px`;
        this.tooltip.style.left = `${left}px`;
        this.tooltip.classList.add('show');
        this.tooltip.setAttribute('aria-hidden', 'false');
    }
    static getTooltipText(element) {
        return element.dataset.tooltip || element.querySelector('.nav-text, .contact-text')?.textContent?.trim() || element.textContent?.trim();
    }
    static hide() {
        this.tooltip.classList.remove('show');
        this.tooltip.setAttribute('aria-hidden', 'true');
    }
}

// ===== BACK TO TOP MANAGER =====
class BackToTopManager {
    static init() {
        this.button = DomUtils.$('#backToTop');
        if (!this.button) return;
        this.scrollHandler = DomUtils.throttle(() => this.toggleVisibility(), CONFIG.SCROLL_THROTTLE_MS);
        window.addEventListener('scroll', this.scrollHandler);
        this.button.addEventListener('click', () => this.scrollToTop());
        this.button.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.scrollToTop();
            }
        });
    }
    static toggleVisibility() {
        const shouldShow = window.pageYOffset > CONFIG.BACK_TO_TOP_THRESHOLD;
        this.button.classList.toggle('show', shouldShow);
        this.button.setAttribute('aria-hidden', !shouldShow);
    }
    static scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.button.blur();
    }
}

// ===== PORTFOLIO HIERARCHY MANAGER =====
class PortfolioHierarchyManager {
    static init() {
        this.categoryButtons = DomUtils.$$('.portfolio-nav .nav-link-portfolio');
        this.categories = DomUtils.$$('.portfolio-category');
        this.currentCategory = 'data-analysis';
        this.brandingSubnavWrapper = DomUtils.$('.branding-subnav-wrapper');
        this.scrollNavItems = DomUtils.$$('.scroll-nav-item');
        this.brandingSubcategories = DomUtils.$$('.branding-subcategory');
        if (!this.categoryButtons.length) return;
        this.setupEventListeners();
        this.loadState();
        this.setupKeyboardNavigation();
    }
    static setupEventListeners() {
        this.categoryButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const category = btn.dataset.category;
                this.switchCategory(category, true);
            });
        });
        this.scrollNavItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const subcategory = item.dataset.subcategory;
                this.switchBrandingSubcategory(subcategory, true);
            });
        });
    }
    static switchCategory(category, save = false) {
        const wasBranding = this.currentCategory === 'branding';
        const isBranding = category === 'branding';
        this.categories.forEach(cat => {
            const isActive = cat.id === category;
            cat.hidden = !isActive;
            cat.setAttribute('aria-hidden', !isActive);
            if (isActive) {
                cat.classList.add('active');
                setTimeout(() => RevealManager.init(`#${category} .reveal`), 50);
            } else {
                cat.classList.remove('active');
            }
        });
        this.categoryButtons.forEach(btn => {
            const isActive = btn.dataset.category === category;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', isActive);
            btn.setAttribute('tabindex', isActive ? '0' : '-1');
        });
        this.toggleBrandingSubnav(isBranding);
        if (wasBranding && !isBranding) {
            this.resetBrandingSubnav();
            const activeItem = DomUtils.$('.scroll-nav-item.active');
            if (activeItem) {
                this.saveStoredState('lastBrandingSubcategory', activeItem.dataset.subcategory);
            }
        }
        this.currentCategory = category;
        if (save) this.saveStoredState('category', category);
    }
    static toggleBrandingSubnav(show) {
        if (!this.brandingSubnavWrapper) return;
        if (show) {
            this.brandingSubnavWrapper.hidden = false;
            this.brandingSubnavWrapper.style.display = 'block';
            this.brandingSubnavWrapper.offsetHeight;
            this.brandingSubnavWrapper.style.opacity = '0';
            this.brandingSubnavWrapper.style.transform = 'translateY(-10px)';
            this.brandingSubnavWrapper.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            setTimeout(() => {
                this.brandingSubnavWrapper.style.opacity = '1';
                this.brandingSubnavWrapper.style.transform = 'translateY(0)';
            }, 10);
            const lastSubcategory = this.loadStoredState('lastBrandingSubcategory') || 'stationary';
            this.switchBrandingSubcategory(lastSubcategory, false);
        } else {
            this.brandingSubnavWrapper.style.opacity = '0';
            this.brandingSubnavWrapper.style.transform = 'translateY(-10px)';
            this.brandingSubnavWrapper.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            setTimeout(() => {
                this.brandingSubnavWrapper.hidden = true;
                this.brandingSubnavWrapper.style.display = 'none';
                this.brandingSubnavWrapper.style.opacity = '';
                this.brandingSubnavWrapper.style.transform = '';
            }, 300);
        }
    }
    static switchBrandingSubcategory(subcategory, save = false) {
        this.brandingSubcategories.forEach(sub => {
            const isActive = sub.id === subcategory;
            sub.hidden = !isActive;
            sub.setAttribute('aria-hidden', !isActive);
            if (isActive) {
                sub.classList.add('active');
                setTimeout(() => RevealManager.init(`#${subcategory} .reveal`), 50);
            } else {
                sub.classList.remove('active');
            }
        });
        this.scrollNavItems.forEach(item => {
            const isActive = item.dataset.subcategory === subcategory;
            item.classList.toggle('active', isActive);
            item.setAttribute('aria-selected', isActive);
            item.setAttribute('tabindex', isActive ? '0' : '-1');
        });
        if (save) this.saveStoredState('lastBrandingSubcategory', subcategory);
    }
    static resetBrandingSubnav() {
        this.scrollNavItems.forEach(item => {
            item.classList.remove('active');
            item.setAttribute('aria-selected', 'false');
            item.setAttribute('tabindex', '-1');
        });
        this.brandingSubcategories.forEach(sub => {
            sub.hidden = true;
            sub.setAttribute('aria-hidden', 'true');
            sub.classList.remove('active');
        });
        if (this.scrollNavItems.length > 0) {
            this.scrollNavItems[0].setAttribute('tabindex', '0');
        }
        this.saveStoredState('lastBrandingSubcategory', 'stationary');
    }
    static setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            const portfolioNav = e.target.closest('.portfolio-nav');
            if (portfolioNav) {
                const currentIndex = this.categoryButtons.indexOf(e.target);
                if (currentIndex === -1) return;
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    const nextIndex = (currentIndex + 1) % this.categoryButtons.length;
                    this.categoryButtons[nextIndex]?.focus();
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    const prevIndex = (currentIndex - 1 + this.categoryButtons.length) % this.categoryButtons.length;
                    this.categoryButtons[prevIndex]?.focus();
                } else if (e.key === 'Home') {
                    e.preventDefault();
                    this.categoryButtons[0]?.focus();
                } else if (e.key === 'End') {
                    e.preventDefault();
                    this.categoryButtons[this.categoryButtons.length - 1]?.focus();
                }
            }
            const subnavContainer = e.target.closest('.scroll-nav-container');
            if (subnavContainer && this.currentCategory === 'branding') {
                const currentIndex = this.scrollNavItems.indexOf(e.target);
                if (currentIndex === -1) return;
                switch (e.key) {
                    case 'ArrowRight': case 'ArrowDown':
                        e.preventDefault();
                        const nextIndex = (currentIndex + 1) % this.scrollNavItems.length;
                        this.scrollNavItems[nextIndex]?.focus();
                        this.switchBrandingSubcategory(this.scrollNavItems[nextIndex].dataset.subcategory, true);
                        break;
                    case 'ArrowLeft': case 'ArrowUp':
                        e.preventDefault();
                        const prevIndex = (currentIndex - 1 + this.scrollNavItems.length) % this.scrollNavItems.length;
                        this.scrollNavItems[prevIndex]?.focus();
                        this.switchBrandingSubcategory(this.scrollNavItems[prevIndex].dataset.subcategory, true);
                        break;
                    case 'Home':
                        e.preventDefault();
                        this.scrollNavItems[0]?.focus();
                        this.switchBrandingSubcategory(this.scrollNavItems[0].dataset.subcategory, true);
                        break;
                    case 'End':
                        e.preventDefault();
                        const lastIndex = this.scrollNavItems.length - 1;
                        this.scrollNavItems[lastIndex]?.focus();
                        this.switchBrandingSubcategory(this.scrollNavItems[lastIndex].dataset.subcategory, true);
                        break;
                }
            }
        });
    }
    static saveStoredState(key, value) {
        try {
            const state = JSON.parse(localStorage.getItem('portfolioHierarchyState') || '{}');
            state[key] = value;
            localStorage.setItem('portfolioHierarchyState', JSON.stringify(state));
        } catch(e) {}
    }
    static loadStoredState(key) {
        try {
            const state = JSON.parse(localStorage.getItem('portfolioHierarchyState') || '{}');
            return state[key];
        } catch(e) { return null; }
    }
    static loadState() {
        const savedCategory = this.loadStoredState('category') || 'data-analysis';
        this.switchCategory(savedCategory, false);
        if (savedCategory === 'branding') {
            const savedSubcategory = this.loadStoredState('lastBrandingSubcategory') || 'stationary';
            this.switchBrandingSubcategory(savedSubcategory, false);
        }
    }
}

// ===== TESTIMONIAL CAROUSEL MANAGER =====
class TestimonialCarouselManager {
    static init() {
        this.slides = DomUtils.$$('.testimonial-slide');
        this.dotsContainer = DomUtils.$('.testimonial-dots');
        this.prevBtn = DomUtils.$('.testimonial-prev');
        this.nextBtn = DomUtils.$('.testimonial-next');
        this.currentSlide = 0;
        this.autoplayTimer = null;
        this.isPaused = false;
        this.isTransitioning = false;
        if (!this.slides.length || !this.dotsContainer) return;
        this.createDots();
        this.showSlide(0);
        this.startAutoplay();
        this.bindEvents();
        this.setupAccessibility();
    }
    static createDots() {
        this.dotsContainer.innerHTML = '';
        this.dots = [];
        this.slides.forEach((_, index) => {
            const dot = DomUtils.createElement('button', {
                class: ['dot'],
                'aria-label': `Go to testimonial ${index + 1}`,
                'aria-controls': 'testimonial-carousel'
            });
            dot.addEventListener('click', () => {
                this.showSlide(index);
                this.restartAutoplay();
            });
            this.dotsContainer.appendChild(dot);
            this.dots.push(dot);
        });
    }
    static showSlide(index) {
        if (this.isTransitioning) return;
        if (index < 0) index = this.slides.length - 1;
        if (index >= this.slides.length) index = 0;
        this.isTransitioning = true;
        this.slides.forEach(slide => {
            slide.classList.remove('active');
            slide.setAttribute('aria-hidden', 'true');
        });
        this.dots.forEach(dot => {
            dot.classList.remove('active');
            dot.setAttribute('aria-current', 'false');
        });
        this.slides[index].classList.add('active');
        this.slides[index].setAttribute('aria-hidden', 'false');
        this.dots[index]?.classList.add('active');
        this.dots[index]?.setAttribute('aria-current', 'true');
        this.currentSlide = index;
        this.announceSlideChange(index);
        setTimeout(() => { this.isTransitioning = false; }, 500);
    }
    static announceSlideChange(index) {
        const slide = this.slides[index];
        const name = slide.querySelector('.testimonial-author')?.textContent || `Testimonial ${index + 1}`;
        let liveRegion = DomUtils.$('#carousel-live-region');
        if (!liveRegion) {
            liveRegion = DomUtils.createElement('div', {
                id: 'carousel-live-region',
                class: ['sr-only'],
                'aria-live': 'polite',
                'aria-atomic': 'true'
            });
            document.body.appendChild(liveRegion);
        }
        liveRegion.textContent = `Now showing testimonial from ${name}`;
        setTimeout(() => liveRegion.textContent = '', 1000);
    }
    static nextSlide() { this.showSlide(this.currentSlide + 1); }
    static prevSlide() { this.showSlide(this.currentSlide - 1); }
    static startAutoplay() {
        if (this.slides.length < 2) return;
        this.stopAutoplay();
        this.autoplayTimer = setInterval(() => { if (!this.isPaused) this.nextSlide(); }, CONFIG.AUTO_PLAY_INTERVAL);
    }
    static stopAutoplay() {
        if (this.autoplayTimer) { clearInterval(this.autoplayTimer); this.autoplayTimer = null; }
    }
    static restartAutoplay() { this.stopAutoplay(); this.startAutoplay(); }
    static setupAccessibility() {
        const carousel = DomUtils.$('.testimonial-carousel');
        if (!carousel) return;
        carousel.setAttribute('role', 'region');
        carousel.setAttribute('aria-label', 'Testimonials');
        carousel.setAttribute('aria-roledescription', 'carousel');
        this.slides.forEach((slide, index) => {
            slide.setAttribute('role', 'group');
            slide.setAttribute('aria-roledescription', 'slide');
            slide.setAttribute('aria-label', `${index + 1} of ${this.slides.length}`);
        });
    }
    static bindEvents() {
        const carousel = DomUtils.$('.testimonial-carousel');
        if (!carousel) return;
        carousel.addEventListener('mouseenter', () => this.isPaused = true);
        carousel.addEventListener('mouseleave', () => this.isPaused = false);
        carousel.addEventListener('touchstart', () => this.isPaused = true);
        carousel.addEventListener('touchend', () => { setTimeout(() => this.isPaused = false, 3000); });
        this.prevBtn?.addEventListener('click', () => { this.prevSlide(); this.restartAutoplay(); });
        this.nextBtn?.addEventListener('click', () => { this.nextSlide(); this.restartAutoplay(); });
        carousel.addEventListener('keydown', e => {
            if (e.key === 'ArrowLeft') { e.preventDefault(); this.prevSlide(); this.restartAutoplay(); }
            if (e.key === 'ArrowRight') { e.preventDefault(); this.nextSlide(); this.restartAutoplay(); }
            if (e.key === 'Home') { e.preventDefault(); this.showSlide(0); this.restartAutoplay(); }
            if (e.key === 'End') { e.preventDefault(); this.showSlide(this.slides.length - 1); this.restartAutoplay(); }
        });
        let touchStartX = 0;
        carousel.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; });
        carousel.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].screenX;
            const swipeThreshold = 50;
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0) this.nextSlide(); else this.prevSlide();
                this.restartAutoplay();
            }
        });
    }
}

// ===== SKILLS ANIMATION MANAGER =====
class SkillsAnimationManager {
    static init() {
        const skillLevels = DomUtils.$$('.skill-level');
        if (!skillLevels.length) return;
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateSkill(entry.target);
                    this.observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5, rootMargin: '0px 0px -50px 0px' });
        skillLevels.forEach(level => this.observer.observe(level));
        skillLevels.forEach(level => {
            if (DomUtils.isElementInViewport(level, 0.3)) this.animateSkill(level);
        });
    }
    static animateSkill(level) {
        const target = level.dataset.target || level.style.width;
        if (target) {
            const startTime = performance.now();
            const duration = 1000;
            const endWidth = parseFloat(target);
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easeOutCubic = 1 - Math.pow(1 - progress, 3);
                const currentWidth = endWidth * easeOutCubic;
                level.style.width = `${currentWidth}%`;
                if (progress < 1) requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
        }
    }
}

// ===== REVEAL ANIMATION MANAGER =====
class RevealManager {
    static init(selector = '.reveal') {
        const elements = DomUtils.$$(selector);
        if (!elements.length) return;
        if (!('IntersectionObserver' in window)) {
            elements.forEach(el => el.classList.add('revealed'));
            return;
        }
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    this.observer.unobserve(entry.target);
                }
            });
        }, { threshold: CONFIG.REVEAL_THRESHOLD, rootMargin: '0px 0px -50px 0px' });
        elements.forEach(el => this.observer.observe(el));
        elements.forEach(el => {
            if (DomUtils.isElementInViewport(el, CONFIG.REVEAL_THRESHOLD)) {
                el.classList.add('revealed');
                this.observer.unobserve(el);
            }
        });
    }
}

// ===== CONTACT FORM MANAGER =====
class ContactFormManager {
    static init() {
        this.form = DomUtils.$('#contact-form');
        if (!this.form) return;
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.setupValidation();
        this.setupAutoSave();
        this.loadSavedData();
    }
    static setupValidation() {
        const inputs = DomUtils.$$('.form-input, .form-textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => {
                this.clearError(input);
                this.saveFormData();
            });
        });
    }
    static setupAutoSave() {
        this.form.addEventListener('input', DomUtils.debounce(() => { this.saveFormData(); }, 500));
    }
    static loadSavedData() {
        try {
            const savedData = localStorage.getItem('contactFormData');
            if (savedData) {
                const data = JSON.parse(savedData);
                Object.keys(data).forEach(key => {
                    const input = DomUtils.$(`[name="${key}"]`);
                    if (input) input.value = data[key];
                });
            }
        } catch(e) {}
    }
    static saveFormData() {
        try {
            const formData = new FormData(this.form);
            const data = {};
            for (let [key, value] of formData.entries()) data[key] = value;
            localStorage.setItem('contactFormData', JSON.stringify(data));
        } catch(e) {}
    }
    static clearSavedData() { localStorage.removeItem('contactFormData'); }
    static async handleSubmit(e) {
        e.preventDefault();
        if (!this.validateForm()) {
            ToastManager.show('Please fix form errors before submitting', 'error');
            return;
        }
        const submitBtn = DomUtils.$('#submit-btn');
        const originalText = submitBtn?.textContent;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
            submitBtn.setAttribute('aria-busy', 'true');
        }
        try {
            const formData = new FormData(this.form);
            const response = await this.submitForm(formData);
            if (response.success) {
                ToastManager.show('Message sent successfully!', 'success');
                this.form.reset();
                this.clearSavedData();
            } else throw new Error(response.message || 'Submission failed');
        } catch (error) {
            ToastManager.show(error.message || 'Failed to send message. Please try again.', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                submitBtn.removeAttribute('aria-busy');
            }
        }
    }
    static validateForm() {
        let isValid = true;
        const requiredInputs = DomUtils.$$('.form-input[required], .form-textarea[required]');
        requiredInputs.forEach(input => { if (!this.validateField(input)) isValid = false; });
        return isValid;
    }
    static validateField(field) {
        if (field.validity.valid) return true;
        let message = '';
        if (field.validity.valueMissing) message = 'This field is required';
        else if (field.type === 'email' && field.validity.typeMismatch) message = 'Please enter a valid email address';
        else if (field.validity.tooShort) message = `Please enter at least ${field.minLength} characters`;
        else if (field.validity.tooLong) message = `Please enter no more than ${field.maxLength} characters`;
        else if (field.validity.patternMismatch) message = 'Please match the requested format';
        if (message) this.showError(field, message);
        return !message;
    }
    static showError(field, message) {
        field.classList.add('error');
        const errorId = `${field.id || field.name}-error`;
        let errorElement = DomUtils.$(`#${errorId}`);
        if (!errorElement) {
            errorElement = DomUtils.createElement('span', { id: errorId, class: ['form-error'], role: 'alert' });
            field.parentNode.appendChild(errorElement);
        }
        errorElement.textContent = message;
        field.setAttribute('aria-describedby', errorId);
        field.setAttribute('aria-invalid', 'true');
    }
    static clearError(field) {
        field.classList.remove('error');
        field.removeAttribute('aria-invalid');
        const errorId = field.getAttribute('aria-describedby');
        if (errorId) {
            const errorElement = DomUtils.$(`#${errorId}`);
            if (errorElement) {
                errorElement.remove();
                field.removeAttribute('aria-describedby');
            }
        }
    }
    static async submitForm(formData) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const shouldSucceed = Math.random() > 0.2;
                if (shouldSucceed) resolve({ success: true, message: 'Message sent successfully', data: Object.fromEntries(formData) });
                else reject(new Error('Network error. Please check your connection and try again.'));
            }, CONFIG.FORM_SUBMISSION_DELAY);
        });
    }
}

// ===== TOAST MANAGER =====
class ToastManager {
    static show(message, type = 'info') {
        DomUtils.$$('.toast').forEach(toast => toast.remove());
        const toast = DomUtils.createElement('div', {
            class: ['toast', `toast-${type}`],
            role: 'alert',
            'aria-live': 'assertive',
            'aria-atomic': 'true'
        }, [message]);
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, CONFIG.TOAST_DURATION);
        toast.addEventListener('click', () => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); });
        return toast;
    }
}

// ===== PERFORMANCE MANAGER =====
class PerformanceManager {
    static init() {
        this.setupIdleCallback();
        this.lazyLoadImages();
    }
    static setupIdleCallback() {
        if ('requestIdleCallback' in window) requestIdleCallback(() => this.preconnectResources());
        else setTimeout(() => this.preconnectResources(), 2000);
    }
    static lazyLoadImages() {
        const images = DomUtils.$$('img[data-src]');
        if (!images.length) return;
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    if (img.dataset.srcset) img.srcset = img.dataset.srcset;
                    img.removeAttribute('data-src');
                    img.removeAttribute('data-srcset');
                    imageObserver.unobserve(img);
                }
            });
        });
        images.forEach(img => imageObserver.observe(img));
    }
    static preconnectResources() {
        const links = ['https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'];
        links.forEach(link => {
            const preconnect = DomUtils.createElement('link', { rel: 'preconnect', href: link, crossorigin: '' });
            document.head.appendChild(preconnect);
        });
    }
}

// ===== ANALYTICS MANAGER =====
class AnalyticsManager {
    static init() {
        this.setupErrorTracking();
        this.trackPageViews();
        this.trackUserInteractions();
    }
    static setupErrorTracking() {
        window.addEventListener('error', (e) => this.logError('Global Error', e.error));
        window.addEventListener('unhandledrejection', (e) => this.logError('Unhandled Promise Rejection', e.reason));
    }
    static logError(type, error) {
        console.error('Application Error:', { type, message: error?.message || 'Unknown error', stack: error?.stack, url: window.location.href, timestamp: new Date().toISOString(), userAgent: navigator.userAgent });
    }
    static trackPageViews() {
        console.log('Page view:', { page: window.location.pathname, referrer: document.referrer, timestamp: Date.now() });
    }
    static trackUserInteractions() {
        document.addEventListener('click', (e) => {
            const target = e.target;
            if (target.matches('.btn, .nav-link, .portfolio-card, #submit-btn')) {
                console.log('User interaction:', { event: 'click', target: target.tagName, className: target.className, text: target.textContent?.trim().substring(0, 50), href: target.href, timestamp: Date.now() });
            }
        }, { passive: true });
    }
}

// ===== MAIN APPLICATION =====
class PortfolioApp {
    static init() {
        console.log('Initializing Portfolio Application v4.0...');
        YearSetter.init();
        ExperienceCalculator.init();
        SidebarManager.init();
        BackToTopManager.init();
        TooltipManager.init();
        RevealManager.init();
        SkillsAnimationManager.init();
        const portfolioButtons = DomUtils.$$('.nav-link-portfolio');
        if (portfolioButtons.length > 0) PortfolioHierarchyManager.init();
        this.initOptionalComponents();
        PerformanceManager.init();
        AnalyticsManager.init();
        this.setupGlobalErrorHandling();
        document.dispatchEvent(new CustomEvent('portfolio:initialized'));
        console.log('Portfolio application initialized successfully');
    }
    static initOptionalComponents() {
        const testimonialSlides = DomUtils.$$('.testimonial-slide');
        if (testimonialSlides.length > 0) TestimonialCarouselManager.init();
        const contactForm = DomUtils.$('#contact-form');
        if (contactForm) ContactFormManager.init();
    }
    static setupGlobalErrorHandling() {
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            ToastManager.show('An unexpected error occurred. Please refresh the page.', 'error');
        });
    }
    static showToast(message, type = 'info') { return ToastManager.show(message, type); }
    static toggleSidebar() { SidebarManager.toggleDesktop(); }
    static scrollToTop() { BackToTopManager.scrollToTop(); }
    static nextTestimonial() { TestimonialCarouselManager.nextSlide(); }
    static prevTestimonial() { TestimonialCarouselManager.prevSlide(); }
    static filterPortfolio(category) { PortfolioHierarchyManager.switchCategory(category, true); }
    static filterBranding(subcategory) { PortfolioHierarchyManager.switchBrandingSubcategory(subcategory, true); }
}

// ===== START APPLICATION =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PortfolioApp.init());
} else {
    PortfolioApp.init();
}

window.PortfolioApp = PortfolioApp;
window.PortfolioHierarchyManager = PortfolioHierarchyManager;
window.DomUtils = DomUtils;