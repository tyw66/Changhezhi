/**
 * 长河志时间线应用主类
 * 负责时间线数据加载、渲染、筛选和交互控制
 */
class TimelineApp {
    /**
     * 构造函数：初始化 DOM 元素引用、数据状态和配置
     */
    constructor() {
        // 时间线节点容器
        this.timelineNodes = document.getElementById('timelineNodes');
        this.timelineContainer = document.getElementById('timelineContainer');
        
        // 时间切片模式元素
        this.sliceContainer = document.getElementById('sliceContainer');
        this.sliceCards = document.getElementById('sliceCards');
        this.timeSliderContainer = document.getElementById('timeSliderContainer');
        this.timeSlider = document.getElementById('timeSlider');
        this.timeSliderYear = document.getElementById('timeSliderYear');
        this.timeSliderCount = document.getElementById('timeSliderCount');
        this.timeSliderTicks = document.getElementById('timeSliderTicks');
        this.timeSliderMarkers = document.getElementById('timeSliderMarkers');
        
        // 模式切换按钮
        this.modeToggle = document.querySelector('.mode-toggle');
        this.modeBtns = document.querySelectorAll('.mode-btn');
        
        // 侧边栏相关元素
        this.sidebar = document.getElementById('sidebar');
        this.sidebarOverlay = document.getElementById('sidebarOverlay');
        this.sidebarClose = document.getElementById('sidebarClose');
        this.sidebarName = document.getElementById('sidebarName');
        this.sidebarDate = document.getElementById('sidebarDate');
        this.sidebarAuthor = document.getElementById('sidebarAuthor');
        this.sidebarDescription = document.getElementById('sidebarDescription');
        this.sidebarImage = document.getElementById('sidebarImage');
        this.sidebarTags = document.getElementById('sidebarTags');
        
        // 筛选器相关元素
        this.filterSelectWrapper = document.getElementById('filterSelectWrapper');
        this.filterInput = document.getElementById('filterInput');
        this.filterDropdown = document.getElementById('filterDropdown');
        this.filterDropdownContent = document.getElementById('filterDropdownContent');
        this.filterCount = document.getElementById('filterCount');
        this.filterClear = document.getElementById('filterClear');
        
        // 数据源选择器
        this.sourceSelect = document.getElementById('sourceSelect');
        
        // 数据源配置
        this.dataSources = [
            { label: '日本漫画史', path: 'manga' },
            { label: '日本战国史', path: 'sengoku' }
        ];
        
        // 状态变量
        this.events = [];                    // 事件数据数组
        this.currentNode = null;             // 当前激活的时间节点
        this.sidebarVisible = false;         // 侧边栏显示状态
        this.filterDropdownOpen = false;     // 筛选下拉菜单状态
        this.selectedTag = null;             // 当前选中的筛选标签
        this.tagCounts = {};                 // 标签计数映射
        this.currentSource = this.getSavedSource();  // 当前数据源路径
        this.currentMode = 'timeline';       // 当前模式：timeline | slice
        this.currentYear = 2000;             // 当前选中年份
        
        // 数据索引（性能优化）
        this.yearIndex = {};                 // 年份到事件的映射索引
        this.dateRangeIndex = [];            // 按日期范围排序的索引
        this.minYear = 1900;                 // 最小年份
        this.maxYear = 2100;                 // 最大年份
        
        // 初始化应用
        this.init();
    }
    
    /**
     * 初始化方法：按顺序执行初始化步骤
     */
    async init() {
        this.renderSourceOptions();  // 渲染数据源选择选项
        await this.loadEvents();     // 加载事件数据
        this.buildTagCounts();       // 统计标签数量
        this.buildYearIndex();       // 建立年份索引
        this.renderFilterDropdown(); // 渲染标签筛选下拉菜单
        this.renderTimeline();       // 渲染时间线
        this.initTimeSlider();       // 初始化时间滑杆
        this.bindEvents();           // 绑定事件监听器
        this.bindSliceEvents();      // 绑定时间切片模式事件
    }
    
    /**
     * 从 localStorage 获取保存的数据源
     * @returns {string} 数据源路径
     */
    getSavedSource() {
        const saved = localStorage.getItem('timelineSource');
        if (saved) {
            const exists = this.dataSources.some(s => s.path === saved);
            if (exists) return saved;
        }
        return this.dataSources[0].path;
    }
    
    /**
     * 保存当前数据源到 localStorage
     * @param {string} sourcePath - 数据源路径
     */
    saveSource(sourcePath) {
        localStorage.setItem('timelineSource', sourcePath);
    }
    
    /**
     * 渲染数据源选择器选项
     */
    renderSourceOptions() {
        this.sourceSelect.innerHTML = '';
        this.dataSources.forEach(source => {
            const option = document.createElement('option');
            option.value = source.path;
            option.textContent = source.label;
            if (source.path === this.currentSource) {
                option.selected = true;
            }
            this.sourceSelect.appendChild(option);
        });
    }
    
    /**
     * 加载事件数据
     * 从当前数据源的 data.json 文件获取数据，失败时使用默认示例数据
     */
    async loadEvents() {
        try {
            const response = await fetch(`${this.currentSource}/data.json`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            // 支持两种数据格式：{ content: [...] } 或直接数组
            this.events = data.content || data;
            
            // 更新页面标题和副标题
            if (data.title) {
                const h1 = document.querySelector('header h1');
                if (h1) h1.textContent = data.title;
            }
            
            if (data.description) {
                const subtitle = document.querySelector('header .subtitle');
                if (subtitle) subtitle.textContent = data.description;
            }
            
            // 解析日期并计算年份范围
            this.calculateYearRange();
        } catch (error) {
            console.error('Failed to load events:', error);
            this.events = this.getDefaultEvents();
            this.calculateYearRange();
        }
    }
    
    /**
     * 计算年份范围
     */
    calculateYearRange() {
        let min = Infinity;
        let max = -Infinity;
        
        this.events.forEach(event => {
            const dateYear = this.extractYear(event.date);
            const endYear = event.date_end === 'now' ? new Date().getFullYear() : this.extractYear(event.date_end);
            
            if (dateYear < min) min = dateYear;
            if (endYear > max) max = endYear;
        });
        
        this.minYear = min - 5;
        this.maxYear = max + 5;
        this.currentYear = Math.floor((this.minYear + this.maxYear) / 2);
    }
    
    /**
     * 从日期字符串中提取年份
     * @param {string} dateStr - 日期字符串
     * @returns {number} 年份
     */
    extractYear(dateStr) {
        const match = dateStr.match(/(\d{4})/);
        return match ? parseInt(match[1]) : 0;
    }
    
    /**
     * 建立年份索引（性能优化）
     * 为每个年份预计算哪些事件在该年份存在
     */
    buildYearIndex() {
        this.yearIndex = {};
        
        // 初始化年份范围
        for (let year = this.minYear; year <= this.maxYear; year++) {
            this.yearIndex[year] = [];
        }
        
        this.events.forEach((event, index) => {
            const startYear = this.extractYear(event.date);
            const endYear = event.date_end === 'now' ? new Date().getFullYear() : this.extractYear(event.date_end);
            
            for (let year = startYear; year <= endYear; year++) {
                if (this.yearIndex[year]) {
                    this.yearIndex[year].push(index);
                }
            }
        });
        
        // 建立日期范围索引（用于二分查找优化）
        this.dateRangeIndex = this.events.map((event, index) => ({
            start: this.extractYear(event.date),
            end: event.date_end === 'now' ? new Date().getFullYear() : this.extractYear(event.date_end),
            index: index
        })).sort((a, b) => a.start - b.start);
    }
    
    /**
     * 获取默认示例事件数据（备用数据）
     * @returns {Array} 示例事件数组
     */
    getDefaultEvents() {
        return [
            { name: '示例条目1', date: '2000-01-01', description: '这是一个示例条目描述。' },
            { name: '示例条目2', date: '2010-06-15', description: '这是另一个示例条目描述。' },
            { name: '示例条目3', date: '2020-12-25', description: '这是第三个示例条目描述。' }
        ];
    }
    
    /**
     * 统计每个标签出现的次数
     * 遍历所有事件，构建标签计数映射
     */
    buildTagCounts() {
        this.tagCounts = {};
        
        this.events.forEach(event => {
            // 统一处理标签格式：数组或字符串转为数组
            const tags = Array.isArray(event.tag) ? event.tag : (event.tag ? [event.tag] : []);
            tags.forEach(tag => {
                if (!this.tagCounts[tag]) {
                    this.tagCounts[tag] = 0;
                }
                this.tagCounts[tag]++;
            });
        });
    }
    
    /**
     * 渲染标签筛选下拉菜单
     * 按标签出现次数降序排列
     */
    renderFilterDropdown() {
        // 按标签计数降序排序
        const tags = Object.keys(this.tagCounts).sort((a, b) => {
            return this.tagCounts[b] - this.tagCounts[a];
        });
        
        // 更新标签数量显示
        this.filterCount.textContent = `${tags.length} 个标签`;
        this.filterDropdownContent.innerHTML = '';
        
        // 渲染每个标签项
        tags.forEach(tag => {
            const count = this.tagCounts[tag];
            const item = document.createElement('div');
            item.className = 'filter-item';
            // 如果是当前选中的标签，添加激活样式
            if (this.selectedTag === tag) {
                item.classList.add('active');
            }
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'filter-item-name';
            nameSpan.textContent = tag;
            
            const countSpan = document.createElement('span');
            countSpan.className = 'filter-item-count';
            countSpan.textContent = `(${count})`;
            
            item.appendChild(nameSpan);
            item.appendChild(countSpan);
            
            // 绑定点击事件
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectTag(tag);
            });
            
            this.filterDropdownContent.appendChild(item);
        });
    }
    
    /**
     * 切换标签筛选下拉菜单的显示状态
     */
    toggleFilterDropdown() {
        this.filterDropdownOpen = !this.filterDropdownOpen;
        if (this.filterDropdownOpen) {
            this.filterSelectWrapper.classList.add('open');
        } else {
            this.filterSelectWrapper.classList.remove('open');
        }
    }
    
    /**
     * 关闭标签筛选下拉菜单
     */
    closeFilterDropdown() {
        this.filterDropdownOpen = false;
        this.filterSelectWrapper.classList.remove('open');
    }
    
    /**
     * 选中标签进行筛选
     * @param {string} tag - 选中的标签名称
     */
    selectTag(tag) {
        this.selectedTag = tag;
        this.filterInput.value = tag;
        this.filterInput.classList.add('has-value');
        this.filterClear.style.display = 'flex';
        
        // 更新下拉菜单选中状态，关闭菜单，执行筛选
        this.renderFilterDropdown();
        this.closeFilterDropdown();
        this.filterTimelineByTag(tag);
    }
    
    /**
     * 清除当前标签筛选
     */
    clearFilter() {
        this.selectedTag = null;
        this.filterInput.value = '';
        this.filterInput.classList.remove('has-value');
        this.filterClear.style.display = 'none';
        
        // 更新下拉菜单，清除筛选
        this.renderFilterDropdown();
        this.filterTimelineByTag(null);
    }
    
    /**
     * 根据标签筛选时间线节点
     * @param {string|null} tag - 筛选标签，null 表示不筛选
     */
    filterTimelineByTag(tag) {
        const nodes = this.timelineNodes.querySelectorAll('.timeline-node');
        
        nodes.forEach(node => {
            const hasEvent = node.dataset.hasEvent === 'true';
            
            // 空年份节点：有筛选时隐藏，无筛选时显示
            if (!hasEvent) {
                node.style.display = tag ? 'none' : 'flex';
                return;
            }
            
            // 有事件的节点：根据标签筛选卡片
            const cards = node.querySelectorAll('.node-card');
            let visibleCardCount = 0;
            
            cards.forEach(card => {
                if (!tag) {
                    // 无筛选：显示所有卡片
                    card.style.display = 'flex';
                    visibleCardCount++;
                } else {
                    // 有筛选：检查卡片是否包含该标签
                    const cardTags = card.dataset.tags ? card.dataset.tags.split(',') : [];
                    if (cardTags.includes(tag)) {
                        card.style.display = 'flex';
                        visibleCardCount++;
                    } else {
                        card.style.display = 'none';
                    }
                }
            });
            
            // 节点显示状态：有可见卡片则显示，否则隐藏
            node.style.display = visibleCardCount > 0 ? 'flex' : 'none';
        });
    }
    
    /**
     * 渲染时间线
     * 将事件数据按年份分组，生成时间线节点和卡片
     */
    renderTimeline() {
        this.timelineNodes.innerHTML = '';
        
        // 从日期字符串中提取年份
        const getYear = (dateStr) => {
            const match = dateStr.match(/(\d+)/);
            return match ? parseInt(match[1]) : 0;
        };
        
        const yearRange = [];
        const eventMap = new Map();
        
        // 将事件按年份分组
        this.events.forEach(event => {
            const year = getYear(event.date);
            if (year > 0) {
                if (!eventMap.has(year)) {
                    eventMap.set(year, []);
                }
                eventMap.get(year).push(event);
            }
        });
        
        // 每年内的事件按日期排序
        eventMap.forEach(events => {
            events.sort((a, b) => new Date(a.date) - new Date(b.date));
        });
        
        // 计算年份范围（前后各扩展5年）
        const years = Array.from(eventMap.keys());
        const minYear = years.length > 0 ? Math.min(...years) - 5 : 1945;
        const maxYear = years.length > 0 ? Math.max(...years) + 5 : 2045;
        
        // 生成年份范围数组
        for (let year = minYear; year <= maxYear; year++) {
            yearRange.push({
                year: year,
                events: eventMap.get(year) || []
            });
        }
        
        // 渲染每个年份节点
        yearRange.forEach((data, index) => {
            const node = document.createElement('div');
            node.className = 'timeline-node';
            node.dataset.year = data.year;
            if (data.events.length > 0) {
                node.dataset.hasEvent = 'true';
            }
            
            // 年份显示
            const year = document.createElement('div');
            year.className = 'node-year';
            year.textContent = data.year;
            
            // 节点圆点
            const dotWrapper = document.createElement('div');
            dotWrapper.className = 'node-dot-wrapper';
            
            const dot = document.createElement('div');
            dot.className = 'node-dot';
            // 空年份添加 empty 样式
            if (data.events.length === 0) {
                dot.classList.add('empty');
            }
            
            dotWrapper.appendChild(dot);
            
            node.appendChild(year);
            node.appendChild(dotWrapper);
            
            // 卡片容器
            const cardsWrapper = document.createElement('div');
            cardsWrapper.className = 'node-cards';
            
            // 渲染事件卡片
            if (data.events.length > 0) {
                data.events.forEach((event, eventIndex) => {
                    const card = this.createEventCard(event, eventIndex);
                    // 存储标签数据用于筛选
                    const tags = Array.isArray(event.tag) ? event.tag : (event.tag ? [event.tag] : []);
                    card.dataset.tags = tags.join(',');
                    cardsWrapper.appendChild(card);
                });
            } else {
                // 空年份卡片
                const card = document.createElement('div');
                card.className = 'node-card empty-card';
                
                const emptyText = document.createElement('div');
                emptyText.className = 'empty-year-text';
                emptyText.textContent = `${data.year} 年`;
                card.appendChild(emptyText);
                
                cardsWrapper.appendChild(card);
            }
            
            node.appendChild(cardsWrapper);
            
            this.timelineNodes.appendChild(node);
        });
    }
    
    /**
     * 创建事件卡片（共享方法）
     * @param {Object} event - 事件对象
     * @param {number} eventIndex - 事件索引
     * @returns {HTMLElement} 卡片元素
     */
    createEventCard(event, eventIndex) {
        const card = document.createElement('div');
        card.className = 'node-card';
        card.dataset.eventIndex = eventIndex;
        
        if (event.id) {
            const image = document.createElement('img');
            image.className = 'card-image';
            image.alt = event.name;
            image.loading = 'lazy';
            image.onerror = function() {
                this.style.display = 'none';
            };
            image.src = `${this.currentSource}/avatars/${event.id}.jpg`;
            card.appendChild(image);
        }
        
        const content = document.createElement('div');
        content.className = 'card-content';
        
        const cardHeader = document.createElement('div');
        cardHeader.className = 'card-header';
        
        const title = document.createElement('div');
        title.className = 'card-title';
        title.textContent = event.name;
        
        const date = document.createElement('div');
        date.className = 'card-date';
        const author = Array.isArray(event.tag) ? event.tag[0] : event.tag;
        date.textContent = author || event.date;
        
        cardHeader.appendChild(title);
        cardHeader.appendChild(date);
        
        content.appendChild(cardHeader);
        
        card.appendChild(content);
        
        return card;
    }
    
    /**
     * 格式化日期字符串，提取年份
     * @param {string} dateStr - 日期字符串
     * @returns {string} 年份字符串
     */
    formatYear(dateStr) {
        const match = dateStr.match(/(\d+)/);
        return match ? match[1] : dateStr;
    }
    
    /**
     * 绑定所有事件监听器
     */
    bindEvents() {
        // 时间线点击和悬停事件
        this.timelineNodes.addEventListener('click', (e) => this.handleNodeClick(e));
        this.timelineNodes.addEventListener('mouseover', (e) => this.handleNodeHover(e));
        
        // 侧边栏关闭事件
        this.sidebarClose.addEventListener('click', () => this.hideSidebar());
        this.sidebarOverlay.addEventListener('click', () => this.hideSidebar());
        
        // 筛选下拉菜单事件
        this.filterSelectWrapper.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFilterDropdown();
        });
        
        // 清除筛选事件
        this.filterClear.addEventListener('click', (e) => {
            e.stopPropagation();
            this.clearFilter();
        });
        
        // 点击页面其他区域关闭下拉菜单
        document.addEventListener('click', (e) => {
            if (!this.filterSelectWrapper.contains(e.target)) {
                this.closeFilterDropdown();
            }
        });
        
        // 数据源切换事件
        this.sourceSelect.addEventListener('change', (e) => {
            this.switchSource(e.target.value);
        });
    }
    
    /**
     * 切换数据源
     * @param {string} sourcePath - 新的数据源路径
     */
    async switchSource(sourcePath) {
        this.currentSource = sourcePath;
        this.saveSource(sourcePath);
        this.hideSidebar();
        this.clearFilter();
        await this.loadEvents();
        this.buildTagCounts();
        this.buildYearIndex();
        this.renderFilterDropdown();
        
        if (this.currentMode === 'timeline') {
            this.renderTimeline();
        } else {
            this.initTimeSlider();
            this.renderSliceCards(this.currentYear);
        }
    }
    
    /**
     * 处理时间线节点悬停事件
     * 高亮当前悬停的卡片
     * @param {Event} e - 鼠标事件
     */
    handleNodeHover(e) {
        const card = e.target.closest('.node-card');
        if (!card) return;
        
        const node = card.closest('.timeline-node');
        if (!node) return;
        
        // 移除其他卡片的激活状态，添加当前卡片的激活状态
        const cards = node.querySelectorAll('.node-card');
        cards.forEach(c => c.classList.remove('active-card'));
        card.classList.add('active-card');
    }
    
    /**
     * 处理时间线节点点击事件
     * 打开侧边栏显示事件详情
     * @param {Event} e - 点击事件
     */
    handleNodeClick(e) {
        const card = e.target.closest('.node-card');
        if (!card) return;
        
        const node = card.closest('.timeline-node');
        if (!node) return;
        
        // 空年份节点不响应点击
        if (node.dataset.hasEvent !== 'true') return;
        
        // 获取年份和事件索引
        const year = parseInt(node.dataset.year);
        const eventIndex = parseInt(card.dataset.eventIndex) || 0;
        
        // 筛选该年份的所有事件
        const yearEvents = this.events.filter(ev => {
            const match = ev.date.match(/(\d+)/);
            return match && parseInt(match[1]) === year;
        });
        
        const event = yearEvents[eventIndex];
        if (!event) return;
        
        // 更新卡片激活状态
        const cards = node.querySelectorAll('.node-card');
        cards.forEach(c => c.classList.remove('active-card'));
        card.classList.add('active-card');
        
        // 显示侧边栏详情
        this.showSidebar(event, node);
    }
    
    /**
     * 显示侧边栏，填充事件详情
     * @param {Object} event - 事件对象
     * @param {HTMLElement} node - 当前时间节点元素
     */
    showSidebar(event, node) {
        // 填充事件名称
        this.sidebarName.textContent = event.name;
        
        // 填充日期范围
        const finishDate = event.date_end === 'now' ? '至今' : event.date_end;
        this.sidebarDate.textContent = `${event.date} ~ ${finishDate}`;
        
        // 处理标签
        const tags = Array.isArray(event.tag) ? event.tag : (event.tag ? [event.tag] : []);
        // 第一个标签作为作者/分类显示
        this.sidebarAuthor.textContent = tags.length > 0 ? tags[0] : '';
        this.sidebarAuthor.style.display = tags.length > 0 ? 'inline-flex' : 'none';
        
        // 渲染剩余标签
        this.sidebarTags.innerHTML = '';
        if (tags.length > 1) {
            this.sidebarTags.style.display = 'flex';
            tags.slice(1).forEach(tag => {
                const tagEl = document.createElement('span');
                tagEl.className = 'sidebar-tag';
                tagEl.textContent = tag;
                this.sidebarTags.appendChild(tagEl);
            });
        } else {
            this.sidebarTags.style.display = 'none';
        }
        
        // 填充描述
        this.sidebarDescription.textContent = event.description;
        
        // 处理图片
        if (event.id) {
            this.sidebarImage.alt = event.name;
            this.sidebarImage.style.display = 'block';
            this.sidebarImage.onerror = () => {
                this.sidebarImage.style.display = 'none';
            };
            this.sidebarImage.src = `${this.currentSource}/${event.id}.jpg`; 
        } else {
            this.sidebarImage.style.display = 'none';
        }
        
        // 显示侧边栏和遮罩
        this.sidebar.classList.add('show');
        this.sidebarOverlay.classList.add('show');
        this.sidebarVisible = true;
        
        // 设置激活节点
        this.setActiveNode(node);
    }
    
    /**
     * 隐藏侧边栏
     */
    hideSidebar() {
        this.sidebar.classList.remove('show');
        this.sidebarOverlay.classList.remove('show');
        this.sidebarVisible = false;
        this.clearActiveNode();
    }
    
    /**
     * 设置当前激活的时间节点
     * @param {HTMLElement|null} node - 时间节点元素
     */
    setActiveNode(node) {
        // 清除之前的激活状态
        if (this.currentNode) {
            this.currentNode.classList.remove('active');
            const cards = this.currentNode.querySelectorAll('.node-card');
            cards.forEach(c => c.classList.remove('active-card'));
        }
        // 设置新的激活状态
        this.currentNode = node;
        if (node) {
            node.classList.add('active');
        }
    }
    
    /**
     * 清除当前激活的时间节点状态
     */
    clearActiveNode() {
        if (this.currentNode) {
            this.currentNode.classList.remove('active');
            const cards = this.currentNode.querySelectorAll('.node-card');
            cards.forEach(c => c.classList.remove('active-card'));
            this.currentNode = null;
        }
    }
    
    /**
     * 初始化时间滑杆
     */
    initTimeSlider() {
        this.timeSlider.min = this.minYear;
        this.timeSlider.max = this.maxYear;
        this.timeSlider.value = this.currentYear;
        this.timeSliderYear.textContent = this.currentYear;
        
        this.renderSliderTicks();
        this.renderSliderMarkers();
    }
    
    /**
     * 渲染时间滑杆刻度
     */
    renderSliderTicks() {
        this.timeSliderTicks.innerHTML = '';
        const totalYears = this.maxYear - this.minYear;
        const tickCount = Math.min(50, totalYears);
        
        for (let i = 0; i <= tickCount; i++) {
            const tick = document.createElement('div');
            tick.className = 'time-slider-tick';
            
            const year = this.minYear + Math.floor((i / tickCount) * totalYears);
            if (year % 10 === 0) {
                tick.classList.add('major');
            }
            
            this.timeSliderTicks.appendChild(tick);
        }
    }
    
    /**
     * 渲染时间滑杆标记
     */
    renderSliderMarkers() {
        this.timeSliderMarkers.innerHTML = '';
        
        let year = this.minYear;
        while (year <= this.maxYear) {
            const marker = document.createElement('div');
            marker.className = 'time-slider-marker';
            marker.textContent = year;
            this.timeSliderMarkers.appendChild(marker);
            
            const interval = year < 2000 ? 50 : 20;
            year += interval;
        }
    }
    
    /**
     * 切换显示模式
     * @param {string} mode - 模式名称：timeline | slice
     */
    switchMode(mode) {
        this.currentMode = mode;
        
        // 更新按钮状态
        this.modeBtns.forEach(btn => {
            if (btn.dataset.mode === mode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // 切换容器显示
        if (mode === 'timeline') {
            this.timelineContainer.style.display = 'block';
            this.sliceContainer.style.display = 'none';
            this.timeSliderContainer.style.display = 'none';
            this.renderTimeline();
        } else {
            this.timelineContainer.style.display = 'none';
            this.sliceContainer.style.display = 'block';
            this.timeSliderContainer.style.display = 'block';
            this.initTimeSlider();
            this.renderSliceCards(this.currentYear);
        }
        
        this.hideSidebar();
    }
    
    /**
     * 获取指定年份的事件列表（使用预计算索引）
     * @param {number} year - 年份
     * @returns {Array} 事件列表
     */
    getEventsByYear(year) {
        const eventIndices = this.yearIndex[year] || [];
        
        return eventIndices.map(index => ({
            ...this.events[index],
            __index: index
        }));
    }
    
    /**
     * 获取指定年份的事件列表（使用二分查找优化）
     * @param {number} year - 年份
     * @returns {Array} 事件列表
     */
    getEventsByYearOptimized(year) {
        const result = [];
        
        let left = 0;
        let right = this.dateRangeIndex.length - 1;
        
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const range = this.dateRangeIndex[mid];
            
            if (range.start <= year) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        
        const candidates = this.dateRangeIndex.slice(0, left);
        
        for (const range of candidates) {
            if (year <= range.end) {
                result.push({
                    ...this.events[range.index],
                    __index: range.index
                });
            }
        }
        
        return result;
    }
    
    /**
     * 渲染时间切片卡片
     * @param {number} year - 年份
     */
    renderSliceCards(year) {
        this.currentYear = year;
        this.timeSlider.value = year;
        this.timeSliderYear.textContent = year;
        
        let events;
        
        if (this.events.length > 1000) {
            events = this.getEventsByYearOptimized(year);
        } else {
            events = this.getEventsByYear(year);
        }
        
        this.timeSliderCount.textContent = `${events.length} 项内容`;
        
        if (events.length === 0) {
            this.renderEmptySlice();
            return;
        }
        
        this.sliceCards.innerHTML = '';
        
        events.forEach((event) => {
            const card = this.createEventCard(event, event.__index);
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showSidebar(event, null);
            });
            this.sliceCards.appendChild(card);
        });
    }
    
    /**
     * 渲染空状态
     */
    renderEmptySlice() {
        this.sliceCards.innerHTML = `
            <div class="slice-empty">
                <div class="slice-empty-icon">📅</div>
                <div class="slice-empty-text">${this.currentYear} 年暂无内容</div>
                <div class="slice-empty-subtext">请尝试拖动时间滑杆选择其他年份</div>
            </div>
        `;
    }
    
    /**
     * 处理时间切片卡片点击事件
     * @param {Event} e - 点击事件
     */
    handleSliceCardClick(e) {
        const card = e.target.closest('.node-card');
        if (!card) return;
        
        const eventIndex = parseInt(card.dataset.eventIndex);
        const event = this.events[eventIndex];
        
        if (!event) return;
        
        this.showSidebar(event, null);
    }
    
    /**
     * 处理时间滑杆变化事件
     * @param {Event} e - 事件对象
     */
    handleTimeSliderChange(e) {
        const year = parseInt(e.target.value);
        this.renderSliceCards(year);
    }
    
    /**
     * 绑定时间切片模式事件
     */
    bindSliceEvents() {
        // 模式切换事件
        this.modeToggle.addEventListener('click', (e) => {
            const btn = e.target.closest('.mode-btn');
            if (btn && btn.dataset.mode !== this.currentMode) {
                this.switchMode(btn.dataset.mode);
            }
        });
        
        // 时间滑杆事件
        this.timeSlider.addEventListener('input', (e) => {
            const year = parseInt(e.target.value);
            this.timeSliderYear.textContent = year;
        });
        
        this.timeSlider.addEventListener('change', (e) => {
            this.handleTimeSliderChange(e);
        });
        
        // 时间切片卡片点击事件
        this.sliceCards.addEventListener('click', (e) => {
            this.handleSliceCardClick(e);
        });
    }
}

/**
 * 页面加载完成后初始化应用
 */
document.addEventListener('DOMContentLoaded', () => {
    new TimelineApp();
});