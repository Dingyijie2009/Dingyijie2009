// 使用全局的 Realtime Database 实例
const messagesRef = window.realtimeDb.ref('messages');

// DOM 元素
const messageModal = document.getElementById('message-modal');
const modalContent = document.querySelector('.modal-content');
const closeModalBtn = document.getElementById('close-modal');
const submitMessageBtn = document.getElementById('submit-message');
const messageInput = document.getElementById('message-input');
const messageLeavesContainer = document.getElementById('message-leaves');
const treeContent = document.querySelector('.tree-content');
const treeContentWrapper = document.querySelector('.tree-content-wrapper');

// 检查是否是iOS设备
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
let originalHeight;
let originalScrollPos;

// 显示模态框
function showModal() {
    originalScrollPos = window.pageYOffset;
    originalHeight = window.innerHeight;
    
    messageModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${originalScrollPos}px`;
    
    messageInput.focus();
}

// 隐藏模态框
function hideModal() {
    messageModal.style.display = 'none';
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.top = '';
    window.scrollTo(0, originalScrollPos);
    messageInput.value = '';
    messageInput.blur();
}

// 点击树区域打开留言框
treeContent.addEventListener('click', (e) => {
    // 如果点击的是叶子或者其内部元素，不触发打开模态框
    if (!e.target.closest('.message-leaf')) {
        showModal();
    }
});

// 处理模态框内容的点击事件
modalContent.addEventListener('click', (e) => {
    e.stopPropagation();
});

// 处理输入框的事件
messageInput.addEventListener('click', (e) => e.stopPropagation());
messageInput.addEventListener('touchstart', (e) => e.stopPropagation());
messageInput.addEventListener('touchend', (e) => e.stopPropagation());

// 点击模态框背景关闭
messageModal.addEventListener('click', (e) => {
    if (e.target === messageModal) {
        hideModal();
    }
});

// 点击关闭按钮关闭模态框
closeModalBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    hideModal();
});

// 提交留言
submitMessageBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const message = messageInput.value.trim();
    if (!message) {
        alert('请输入留言内容');
        return;
    }
    
    if (!messagesRef) {
        alert('系统初始化中，请稍后再试');
        return;
    }

    try {
        await messagesRef.push({
            content: message,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        hideModal();
    } catch (error) {
        console.error('Error adding message:', error);
        alert('发送失败，请重试');
    }
});

// 加载和显示消息
function createMessageLeaf(message, key, index, total) {
    const leaf = document.createElement('div');
    leaf.className = 'message-leaf';
    leaf.setAttribute('data-key', key);
    leaf.setAttribute('data-content', message.content);
    
    // 添加装饰叶子
    const leafDecor = document.createElement('span');
    leafDecor.className = 'leaf-decor';
    leafDecor.textContent = '🍃';
    leaf.appendChild(leafDecor);
    
    // 根据文字长度设置叶子大小类
    const contentLength = message.content.length;
    if (contentLength <= 5) {
        leaf.classList.add('leaf-tiny');
    } else if (contentLength <= 15) {
        leaf.classList.add('leaf-small');
    } else if (contentLength <= 30) {
        leaf.classList.add('leaf-medium');
    } else {
        leaf.classList.add('leaf-large');
    }
    
    // 使用消息索引计算位置，确保位置固定
    const section = index % 4; // 将树分为4个区域
    const baseAngle = (section * 90) + ((index % 3) * 20); // 每个区域内分成3份，间隔改为20度
    const radius = 120 + (index % 3) * 40; // 减小基础半径和间距
    
    // 将极坐标转换为笛卡尔坐标，调整分布范围
    const radian = (baseAngle * Math.PI) / 180;
    const x = 50 + (radius * Math.cos(radian) / 4); // 调整除数，控制水平分布
    const y = 50 + (radius * Math.sin(radian) / 5); // 调整除数，控制垂直分布
    
    // 添加小范围随机偏移
    const randomOffsetX = (Math.random() - 0.5) * 10;
    const randomOffsetY = (Math.random() - 0.5) * 8;
    
    leaf.style.left = `${x + randomOffsetX}%`;
    leaf.style.top = `${y + randomOffsetY}%`;
    
    // 使用CSS自定义属性存储初始旋转角度
    const rotation = baseAngle % 20 - 10; // 减小旋转角度范围到-10到10度之间
    leaf.style.setProperty('--initial-rotation', `${rotation}deg`);
    
    // 动画延迟基于索引，使叶子依次出现
    leaf.style.animationDelay = `${index * 0.1}s`;
    
    return leaf;
}

// 实时监听消息更新
function initializeMessageListener() {
    if (!messagesRef) {
        console.error('Messages reference not initialized');
        return;
    }

    messagesRef
        .orderByChild('timestamp')
        .limitToLast(12) // 限制显示最新的12条消息
        .on('value', (snapshot) => {
            messageLeavesContainer.innerHTML = '';
            
            if (!snapshot.exists()) {
                const emptyMessage = document.createElement('div');
                emptyMessage.className = 'empty-message';
                emptyMessage.textContent = '暂无留言，来添加第一条吧！';
                messageLeavesContainer.appendChild(emptyMessage);
                return;
            }

            // 将数据转换为数组并按时间戳排序
            const messages = [];
            snapshot.forEach((childSnapshot) => {
                messages.push({
                    key: childSnapshot.key,
                    data: childSnapshot.val()
                });
            });
            
            // 按时间戳排序，确保顺序一致
            messages.sort((a, b) => b.data.timestamp - a.data.timestamp);

            // 显示消息
            messages.forEach((message, index) => {
                if (message.data && message.data.content) {
                    const leaf = createMessageLeaf(message.data, message.key, index, messages.length);
                    messageLeavesContainer.appendChild(leaf);
                }
            });
        }, (error) => {
            console.error('Error loading messages:', error);
            messageLeavesContainer.innerHTML = '<div class="error-message">加载失败，请刷新页面重试</div>';
        });
}

// 在页面加载完成后初始化监听器
document.addEventListener('DOMContentLoaded', () => {
    initializeMessageListener();
});

// 处理iOS键盘事件
if (isIOS) {
    let originalHeight = window.innerHeight;
    
    window.addEventListener('resize', () => {
        const currentHeight = window.innerHeight;
        
        if (messageModal.style.display === 'flex') {
            if (currentHeight < originalHeight) {
                // 键盘弹出
                messageModal.style.height = `${originalHeight}px`;
                modalContent.style.position = 'absolute';
                modalContent.style.bottom = '20px';
                modalContent.style.left = '50%';
                modalContent.style.transform = 'translateX(-50%)';
                window.scrollTo(0, 0);
            } else {
                // 键盘收起
                modalContent.style.position = 'relative';
                modalContent.style.bottom = 'auto';
                modalContent.style.left = 'auto';
                modalContent.style.transform = 'none';
                // 恢复原始滚动位置
                window.scrollTo(0, originalScrollPos);
            }
        }
    });

    // 防止iOS橡皮筋效果和滚动
    messageModal.addEventListener('touchmove', (e) => {
        if (e.target !== messageInput) {
            e.preventDefault();
        }
    }, { passive: false });

    // 处理输入框焦点
    messageInput.addEventListener('focus', () => {
        setTimeout(() => {
            messageInput.scrollIntoView(false);
        }, 300);
    });

    // 处理输入框失去焦点
    messageInput.addEventListener('blur', () => {
        setTimeout(() => {
            window.scrollTo(0, originalScrollPos);
        }, 100);
    });
}

// 防止触摸事件穿透
modalContent.addEventListener('touchstart', (e) => e.stopPropagation());
modalContent.addEventListener('touchend', (e) => e.stopPropagation());
messageInput.addEventListener('touchstart', (e) => e.stopPropagation());
messageInput.addEventListener('touchend', (e) => e.stopPropagation()); 