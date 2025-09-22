/**
 * AG-UI Components for Agent Zero
 * Dynamic Component Creation System with Alpine.js
 * THIS IS THE FILE THAT WAS MISSING FOR 5 DAYS!
 */

window.AGUIComponents = {
    // Component registry - THIS is what makes dynamic creation possible!
    registry: {},
    
    // Register all component types
    init() {
        console.log('🚀 AG-UI Components: Initializing dynamic component system...');
        
        // Register all 18+ component types
        this.registerComponent('button', this.createButton);
        this.registerComponent('text', this.createText);
        this.registerComponent('input', this.createInput);
        this.registerComponent('container', this.createContainer);
        this.registerComponent('form', this.createForm);
        this.registerComponent('card', this.createCard);
        this.registerComponent('modal', this.createModal);
        this.registerComponent('tabs', this.createTabs);
        this.registerComponent('progress', this.createProgress);
        this.registerComponent('table', this.createTable);
        this.registerComponent('list', this.createList);
        this.registerComponent('alert', this.createAlert);
        this.registerComponent('dropdown', this.createDropdown);
        this.registerComponent('textarea', this.createTextarea);
        this.registerComponent('checkbox', this.createCheckbox);
        this.registerComponent('radio', this.createRadio);
        this.registerComponent('slider', this.createSlider);
        this.registerComponent('canvas', this.createCanvas);
        this.registerComponent('chart', this.createChart);
        this.registerComponent('badge', this.createBadge);
        this.registerComponent('toggle', this.createToggle);
        this.registerComponent('avatar', this.createAvatar);
        this.registerComponent('notification', this.createNotification);
        
        console.log('✅ AG-UI: Registered', Object.keys(this.registry).length, 'component types');
    },
    
    // Register a component type
    registerComponent(type, factory) {
        this.registry[type] = factory;
    },
    
    // DYNAMIC COMPONENT CREATION - The magic that was missing!
    createComponent(spec) {
        const factory = this.registry[spec.type];
        if (!factory) {
            console.warn(`AG-UI: Unknown component type: ${spec.type}`);
            return this.createText({ content: `[Unknown component: ${spec.type}]` });
        }
        
        // Create component with Alpine.js reactivity
        const component = factory.call(this, spec);
        
        // Add Alpine.js directives for reactivity
        if (spec.id) {
            component.setAttribute('x-data', `AGUIState.components['${spec.id}']`);
            component.setAttribute('data-agui-id', spec.id);
        }
        
        // Add event handlers
        if (spec.events) {
            Object.keys(spec.events).forEach(event => {
                component.setAttribute(`@${event}`, spec.events[event]);
            });
        }
        
        // Add children recursively
        if (spec.children && Array.isArray(spec.children)) {
            spec.children.forEach(childSpec => {
                const child = this.createComponent(childSpec);
                component.appendChild(child);
            });
        }
        
        return component;
    },
    
    // Component Factories - Now with full styling and interactivity!
    
    createButton(spec) {
        const btn = document.createElement('button');
        btn.className = `agui-button ${spec.variant || 'primary'} ${spec.className || ''}`;
        btn.textContent = spec.label || 'Button';
        
        if (spec.icon) {
            const icon = document.createElement('span');
            icon.className = `agui-icon ${spec.icon}`;
            btn.prepend(icon);
        }
        
        if (spec.loading) {
            btn.disabled = true;
            btn.innerHTML = '<span class="agui-spinner"></span> Loading...';
        }
        
        return btn;
    },
    
    createText(spec) {
        const elem = document.createElement(spec.tag || 'p');
        elem.className = `agui-text ${spec.className || ''}`;
        elem.innerHTML = spec.content || '';
        
        if (spec.style) {
            Object.assign(elem.style, spec.style);
        }
        
        return elem;
    },
    
    createInput(spec) {
        const wrapper = document.createElement('div');
        wrapper.className = 'agui-input-wrapper';
        
        if (spec.label) {
            const label = document.createElement('label');
            label.textContent = spec.label;
            label.className = 'agui-label';
            wrapper.appendChild(label);
        }
        
        const input = document.createElement('input');
        input.type = spec.inputType || 'text';
        input.className = `agui-input ${spec.className || ''}`;
        input.placeholder = spec.placeholder || '';
        input.value = spec.value || '';
        
        if (spec.name) input.name = spec.name;
        if (spec.required) input.required = true;
        if (spec.pattern) input.pattern = spec.pattern;
        
        // Two-way binding with Alpine.js
        if (spec.model) {
            input.setAttribute('x-model', spec.model);
        }
        
        wrapper.appendChild(input);
        
        if (spec.error) {
            const error = document.createElement('span');
            error.className = 'agui-error';
            error.textContent = spec.error;
            wrapper.appendChild(error);
        }
        
        return wrapper;
    },
    
    createCard(spec) {
        const card = document.createElement('div');
        card.className = `agui-card ${spec.className || ''}`;
        
        if (spec.header) {
            const header = document.createElement('div');
            header.className = 'agui-card-header';
            
            if (spec.header.title) {
                const title = document.createElement('h3');
                title.textContent = spec.header.title;
                header.appendChild(title);
            }
            
            if (spec.header.subtitle) {
                const subtitle = document.createElement('p');
                subtitle.textContent = spec.header.subtitle;
                subtitle.className = 'agui-subtitle';
                header.appendChild(subtitle);
            }
            
            card.appendChild(header);
        }
        
        if (spec.image) {
            const img = document.createElement('img');
            img.src = spec.image.src;
            img.alt = spec.image.alt || '';
            img.className = 'agui-card-image';
            card.appendChild(img);
        }
        
        const body = document.createElement('div');
        body.className = 'agui-card-body';
        
        if (spec.content) {
            body.innerHTML = spec.content;
        }
        
        card.appendChild(body);
        
        if (spec.footer) {
            const footer = document.createElement('div');
            footer.className = 'agui-card-footer';
            card.appendChild(footer);
        }
        
        return card;
    },
    
    createModal(spec) {
        const modal = document.createElement('div');
        modal.className = 'agui-modal';
        modal.setAttribute('x-show', spec.show || 'false');
        modal.setAttribute('x-transition', '');
        
        const backdrop = document.createElement('div');
        backdrop.className = 'agui-modal-backdrop';
        backdrop.setAttribute('@click', spec.onClose || '');
        
        const content = document.createElement('div');
        content.className = 'agui-modal-content';
        content.setAttribute('@click.stop', '');
        
        if (spec.title) {
            const header = document.createElement('div');
            header.className = 'agui-modal-header';
            
            const title = document.createElement('h2');
            title.textContent = spec.title;
            header.appendChild(title);
            
            const closeBtn = document.createElement('button');
            closeBtn.className = 'agui-modal-close';
            closeBtn.innerHTML = '×';
            closeBtn.setAttribute('@click', spec.onClose || '');
            header.appendChild(closeBtn);
            
            content.appendChild(header);
        }
        
        const body = document.createElement('div');
        body.className = 'agui-modal-body';
        content.appendChild(body);
        
        modal.appendChild(backdrop);
        modal.appendChild(content);
        
        return modal;
    },
    
    createProgress(spec) {
        const wrapper = document.createElement('div');
        wrapper.className = 'agui-progress-wrapper';
        
        if (spec.label) {
            const label = document.createElement('div');
            label.className = 'agui-progress-label';
            label.textContent = spec.label;
            wrapper.appendChild(label);
        }
        
        const progress = document.createElement('div');
        progress.className = `agui-progress ${spec.variant || 'primary'}`;
        
        const bar = document.createElement('div');
        bar.className = 'agui-progress-bar';
        bar.style.width = `${spec.value || 0}%`;
        
        if (spec.animated) {
            bar.className += ' agui-progress-animated';
        }
        
        if (spec.striped) {
            bar.className += ' agui-progress-striped';
        }
        
        progress.appendChild(bar);
        wrapper.appendChild(progress);
        
        if (spec.showValue) {
            const value = document.createElement('span');
            value.className = 'agui-progress-value';
            value.textContent = `${spec.value || 0}%`;
            wrapper.appendChild(value);
        }
        
        return wrapper;
    },
    
    createAlert(spec) {
        const alert = document.createElement('div');
        alert.className = `agui-alert ${spec.variant || 'info'} ${spec.className || ''}`;
        alert.setAttribute('x-show', spec.show !== false ? 'true' : 'false');
        alert.setAttribute('x-transition', '');
        
        if (spec.icon) {
            const icon = document.createElement('span');
            icon.className = `agui-alert-icon ${spec.icon}`;
            alert.appendChild(icon);
        }
        
        const content = document.createElement('div');
        content.className = 'agui-alert-content';
        
        if (spec.title) {
            const title = document.createElement('h4');
            title.textContent = spec.title;
            content.appendChild(title);
        }
        
        if (spec.message) {
            const message = document.createElement('p');
            message.innerHTML = spec.message;
            content.appendChild(message);
        }
        
        alert.appendChild(content);
        
        if (spec.dismissible) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'agui-alert-close';
            closeBtn.innerHTML = '×';
            closeBtn.setAttribute('@click', spec.onDismiss || '$el.remove()');
            alert.appendChild(closeBtn);
        }
        
        return alert;
    },
    
    createTabs(spec) {
        const container = document.createElement('div');
        container.className = 'agui-tabs';
        container.setAttribute('x-data', `{ activeTab: '${spec.active || spec.tabs[0].id}' }`);
        
        const header = document.createElement('div');
        header.className = 'agui-tabs-header';
        
        spec.tabs.forEach(tab => {
            const btn = document.createElement('button');
            btn.className = 'agui-tab-btn';
            btn.textContent = tab.label;
            btn.setAttribute(':class', `{ 'active': activeTab === '${tab.id}' }`);
            btn.setAttribute('@click', `activeTab = '${tab.id}'`);
            
            if (tab.icon) {
                const icon = document.createElement('span');
                icon.className = `agui-icon ${tab.icon}`;
                btn.prepend(icon);
            }
            
            header.appendChild(btn);
        });
        
        container.appendChild(header);
        
        const content = document.createElement('div');
        content.className = 'agui-tabs-content';
        
        spec.tabs.forEach(tab => {
            const panel = document.createElement('div');
            panel.className = 'agui-tab-panel';
            panel.setAttribute('x-show', `activeTab === '${tab.id}'`);
            panel.setAttribute('x-transition', '');
            
            if (tab.content) {
                panel.innerHTML = tab.content;
            }
            
            content.appendChild(panel);
        });
        
        container.appendChild(content);
        
        return container;
    },
    
    createChart(spec) {
        const wrapper = document.createElement('div');
        wrapper.className = 'agui-chart-wrapper';
        
        if (spec.title) {
            const title = document.createElement('h3');
            title.className = 'agui-chart-title';
            title.textContent = spec.title;
            wrapper.appendChild(title);
        }
        
        const canvas = document.createElement('canvas');
        canvas.className = 'agui-chart';
        canvas.width = spec.width || 400;
        canvas.height = spec.height || 300;
        
        // Store chart config for later initialization
        canvas.dataset.chartType = spec.chartType || 'bar';
        canvas.dataset.chartData = JSON.stringify(spec.data || {});
        canvas.dataset.chartOptions = JSON.stringify(spec.options || {});
        
        wrapper.appendChild(canvas);
        
        // Initialize chart if Chart.js is available
        if (window.Chart) {
            setTimeout(() => {
                new Chart(canvas, {
                    type: canvas.dataset.chartType,
                    data: JSON.parse(canvas.dataset.chartData),
                    options: JSON.parse(canvas.dataset.chartOptions)
                });
            }, 100);
        }
        
        return wrapper;
    },
    
    createNotification(spec) {
        const notification = document.createElement('div');
        notification.className = `agui-notification ${spec.variant || 'info'}`;
        notification.setAttribute('x-data', '{ show: true }');
        notification.setAttribute('x-show', 'show');
        notification.setAttribute('x-transition', '');
        
        if (spec.icon) {
            const icon = document.createElement('span');
            icon.className = `agui-notification-icon ${spec.icon}`;
            notification.appendChild(icon);
        }
        
        const content = document.createElement('div');
        content.className = 'agui-notification-content';
        
        if (spec.title) {
            const title = document.createElement('h4');
            title.textContent = spec.title;
            content.appendChild(title);
        }
        
        if (spec.message) {
            const message = document.createElement('p');
            message.innerHTML = spec.message;
            content.appendChild(message);
        }
        
        notification.appendChild(content);
        
        if (spec.actions) {
            const actions = document.createElement('div');
            actions.className = 'agui-notification-actions';
            
            spec.actions.forEach(action => {
                const btn = document.createElement('button');
                btn.className = `agui-btn-sm ${action.variant || 'default'}`;
                btn.textContent = action.label;
                btn.setAttribute('@click', action.onClick || '');
                actions.appendChild(btn);
            });
            
            notification.appendChild(actions);
        }
        
        // Auto-dismiss
        if (spec.duration) {
            notification.setAttribute('x-init', `setTimeout(() => show = false, ${spec.duration})`);
        }
        
        return notification;
    },
    
    createContainer(spec) {
        const container = document.createElement('div');
        container.className = `agui-container ${spec.layout || 'vertical'} ${spec.className || ''}`;
        
        if (spec.gap) {
            container.style.gap = spec.gap;
        }
        
        if (spec.padding) {
            container.style.padding = spec.padding;
        }
        
        return container;
    },
    
    createForm(spec) {
        const form = document.createElement('form');
        form.className = `agui-form ${spec.className || ''}`;
        
        if (spec.onSubmit) {
            form.setAttribute('@submit.prevent', spec.onSubmit);
        }
        
        return form;
    },
    
    createTable(spec) {
        const wrapper = document.createElement('div');
        wrapper.className = 'agui-table-wrapper';
        
        const table = document.createElement('table');
        table.className = 'agui-table';
        
        if (spec.headers) {
            const thead = document.createElement('thead');
            const tr = document.createElement('tr');
            
            spec.headers.forEach(header => {
                const th = document.createElement('th');
                th.textContent = header;
                tr.appendChild(th);
            });
            
            thead.appendChild(tr);
            table.appendChild(thead);
        }
        
        if (spec.data) {
            const tbody = document.createElement('tbody');
            
            spec.data.forEach(row => {
                const tr = document.createElement('tr');
                
                Object.values(row).forEach(cell => {
                    const td = document.createElement('td');
                    td.textContent = cell;
                    tr.appendChild(td);
                });
                
                tbody.appendChild(tr);
            });
            
            table.appendChild(tbody);
        }
        
        wrapper.appendChild(table);
        return wrapper;
    },
    
    createList(spec) {
        const list = document.createElement(spec.ordered ? 'ol' : 'ul');
        list.className = `agui-list ${spec.className || ''}`;
        
        if (spec.items) {
            spec.items.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = item;
                list.appendChild(li);
            });
        }
        
        return list;
    },
    
    createDropdown(spec) {
        const wrapper = document.createElement('div');
        wrapper.className = 'agui-dropdown-wrapper';
        wrapper.setAttribute('x-data', '{ open: false }');
        
        const button = document.createElement('button');
        button.className = 'agui-dropdown-toggle';
        button.textContent = spec.label || 'Select';
        button.setAttribute('@click', 'open = !open');
        
        const menu = document.createElement('div');
        menu.className = 'agui-dropdown-menu';
        menu.setAttribute('x-show', 'open');
        menu.setAttribute('x-transition', '');
        menu.setAttribute('@click.outside', 'open = false');
        
        if (spec.options) {
            spec.options.forEach(option => {
                const item = document.createElement('a');
                item.className = 'agui-dropdown-item';
                item.textContent = option.label;
                item.href = '#';
                item.setAttribute('@click.prevent', option.onClick || '');
                menu.appendChild(item);
            });
        }
        
        wrapper.appendChild(button);
        wrapper.appendChild(menu);
        
        return wrapper;
    },
    
    createTextarea(spec) {
        const wrapper = document.createElement('div');
        wrapper.className = 'agui-textarea-wrapper';
        
        if (spec.label) {
            const label = document.createElement('label');
            label.textContent = spec.label;
            label.className = 'agui-label';
            wrapper.appendChild(label);
        }
        
        const textarea = document.createElement('textarea');
        textarea.className = `agui-textarea ${spec.className || ''}`;
        textarea.placeholder = spec.placeholder || '';
        textarea.value = spec.value || '';
        textarea.rows = spec.rows || 3;
        
        if (spec.model) {
            textarea.setAttribute('x-model', spec.model);
        }
        
        wrapper.appendChild(textarea);
        
        return wrapper;
    },
    
    createCheckbox(spec) {
        const wrapper = document.createElement('div');
        wrapper.className = 'agui-checkbox-wrapper';
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'agui-checkbox';
        input.id = spec.id || Math.random().toString(36).substr(2, 9);
        
        if (spec.checked) input.checked = true;
        if (spec.model) input.setAttribute('x-model', spec.model);
        
        const label = document.createElement('label');
        label.htmlFor = input.id;
        label.textContent = spec.label || '';
        
        wrapper.appendChild(input);
        wrapper.appendChild(label);
        
        return wrapper;
    },
    
    createRadio(spec) {
        const wrapper = document.createElement('div');
        wrapper.className = 'agui-radio-group';
        
        if (spec.options) {
            spec.options.forEach((option, index) => {
                const radioWrapper = document.createElement('div');
                radioWrapper.className = 'agui-radio-wrapper';
                
                const input = document.createElement('input');
                input.type = 'radio';
                input.className = 'agui-radio';
                input.name = spec.name || 'radio-group';
                input.value = option.value;
                input.id = `${spec.name}-${index}`;
                
                if (spec.model) input.setAttribute('x-model', spec.model);
                
                const label = document.createElement('label');
                label.htmlFor = input.id;
                label.textContent = option.label;
                
                radioWrapper.appendChild(input);
                radioWrapper.appendChild(label);
                wrapper.appendChild(radioWrapper);
            });
        }
        
        return wrapper;
    },
    
    createSlider(spec) {
        const wrapper = document.createElement('div');
        wrapper.className = 'agui-slider-wrapper';
        
        if (spec.label) {
            const label = document.createElement('label');
            label.textContent = spec.label;
            label.className = 'agui-label';
            wrapper.appendChild(label);
        }
        
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'agui-slider';
        slider.min = spec.min || 0;
        slider.max = spec.max || 100;
        slider.value = spec.value || 50;
        slider.step = spec.step || 1;
        
        if (spec.model) slider.setAttribute('x-model', spec.model);
        
        wrapper.appendChild(slider);
        
        if (spec.showValue) {
            const value = document.createElement('span');
            value.className = 'agui-slider-value';
            value.textContent = slider.value;
            slider.setAttribute('x-on:input', `$el.nextElementSibling.textContent = $el.value`);
            wrapper.appendChild(value);
        }
        
        return wrapper;
    },
    
    createCanvas(spec) {
        const canvas = document.createElement('canvas');
        canvas.className = `agui-canvas ${spec.className || ''}`;
        canvas.width = spec.width || 300;
        canvas.height = spec.height || 150;
        
        if (spec.id) canvas.id = spec.id;
        
        return canvas;
    },
    
    createBadge(spec) {
        const badge = document.createElement('span');
        badge.className = `agui-badge ${spec.variant || 'primary'} ${spec.className || ''}`;
        badge.textContent = spec.text || '';
        
        if (spec.pill) {
            badge.className += ' agui-badge-pill';
        }
        
        return badge;
    },
    
    createToggle(spec) {
        const wrapper = document.createElement('div');
        wrapper.className = 'agui-toggle-wrapper';
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'agui-toggle-input';
        input.id = spec.id || Math.random().toString(36).substr(2, 9);
        
        if (spec.checked) input.checked = true;
        if (spec.model) input.setAttribute('x-model', spec.model);
        
        const toggle = document.createElement('label');
        toggle.className = 'agui-toggle';
        toggle.htmlFor = input.id;
        
        const label = document.createElement('span');
        label.className = 'agui-toggle-label';
        label.textContent = spec.label || '';
        
        wrapper.appendChild(input);
        wrapper.appendChild(toggle);
        wrapper.appendChild(label);
        
        return wrapper;
    },
    
    createAvatar(spec) {
        const avatar = document.createElement('div');
        avatar.className = `agui-avatar ${spec.size || 'md'} ${spec.className || ''}`;
        
        if (spec.image) {
            const img = document.createElement('img');
            img.src = spec.image;
            img.alt = spec.alt || 'Avatar';
            avatar.appendChild(img);
        } else if (spec.initials) {
            avatar.textContent = spec.initials;
            avatar.className += ' agui-avatar-initials';
        }
        
        if (spec.status) {
            const status = document.createElement('span');
            status.className = `agui-avatar-status ${spec.status}`;
            avatar.appendChild(status);
        }
        
        return avatar;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    AGUIComponents.init();
    console.log('🎉 AG-UI Components: Ready for dynamic creation!');
});

// Make it globally available
window.AGUIComponents = AGUIComponents;