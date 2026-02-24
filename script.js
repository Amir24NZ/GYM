let members = JSON.parse(localStorage.getItem('gymMembers')) || [];
let currentMemberId = null;
let viewHistory = ['view-dashboard'];
let APP_VERSION = localStorage.getItem('appVersion') || '1.0.0';
let currentReportData = { members: [], transactions: [] };

// آیکون‌های مرتب‌سازی (فقط ایموجی برای دکمه)
const dashboardSortIcons = {
    'newest': '🆕',
    'oldest': '📅',
    'name': '🔤',
    'sessions': '🏋️',
    'spent': '💰',
    'debt': '⚠️'
};

const reportMembersSortIcons = {
    'sessions-desc': '🏋️',
    'sessions-asc': '🏋️',
    'name': '🔤',
    'payment-desc': '💰',
    'payment-asc': '💰'
};

const reportTransactionsSortIcons = {
    'newest': '🆕',
    'oldest': '📅',
    'amount-asc': '💰',
    'amount-desc': '💰',
    'name': '🔤'
};

document.addEventListener('DOMContentLoaded', () => {
    updateDate();
    updateBackupStatus();
    updateSortButtons();
    renderDashboard();
    checkForUpdate(false);
    
    // جلوگیری از خروج با دکمه بازگشت در موبایل
    history.pushState(null, null, location.href);
    window.onpopstate = function() {
        if(viewHistory.length > 1) {
            goBack();
        } else {
            history.pushState(null, null, location.href);
        }
    };
});

function updateDate() {
    const now = new Date();
    const weekday = now.toLocaleDateString('fa-IR', { weekday: 'long' });
    const year = now.toLocaleDateString('fa-IR', { year: 'numeric' });
    const month = now.toLocaleDateString('fa-IR', { month: 'long' });
    const day = now.toLocaleDateString('fa-IR', { day: 'numeric' });
    document.getElementById('date-display').innerText = `${weekday}، ${day} ${month} ${year}`;
}

function updateSortButtons() {
    const dashboardSort = document.getElementById('sort-members').value;
    const reportMembersSort = document.getElementById('sort-report-members').value;
    const reportTransactionsSort = document.getElementById('sort-report-transactions').value;
    
    document.getElementById('dashboard-sort-icon').innerText = dashboardSortIcons[dashboardSort];
    document.getElementById('report-members-sort-icon').innerText = reportMembersSortIcons[reportMembersSort];
    document.getElementById('report-transactions-sort-icon').innerText = reportTransactionsSortIcons[reportTransactionsSort];
}

function dashboardSortChanged() {
    updateSortButtons();
    renderDashboard();
}

function reportMembersSortChanged() {
    updateSortButtons();
    renderReportMembers();
}

function reportTransactionsSortChanged() {
    updateSortButtons();
    renderReportTransactions();
}

function showView(viewId, title = '') {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    if(viewHistory[viewHistory.length - 1] !== viewId) {
        viewHistory.push(viewId);
        history.pushState(null, null, location.href);
    }
    updateHeader(viewId, title);
    if(viewId === 'view-dashboard') {
        renderDashboard();
        updateBackupStatus();
    }
}

function updateHeader(viewId, title) {
    const backBtn = document.getElementById('back-btn');
    const headerTitle = document.getElementById('header-title');
    if(viewId === 'view-dashboard') {
        backBtn.style.display = 'none';
        headerTitle.innerText = 'باشگاه اردلان';
    } else {
        backBtn.style.display = 'flex';
        if(title) {
            headerTitle.innerText = title;
        } else if(viewId === 'view-add-member') {
            headerTitle.innerText = 'افزودن عضو';
        } else if(viewId === 'view-member-detail') {
            headerTitle.innerText = 'جزئیات عضو';
        } else if(viewId === 'view-monthly-report') {
            headerTitle.innerText = 'گزارش ماهانه';
        }
    }
}

function goBack() {
    if(viewHistory.length > 1) {
        viewHistory.pop();
        const previousView = viewHistory[viewHistory.length - 1];
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
        document.getElementById(previousView).classList.add('active');
        updateHeader(previousView);
        if(previousView === 'view-dashboard') {
            renderDashboard();
            updateBackupStatus();
        } else if(previousView === 'view-member-detail' && currentMemberId) {
            openMemberDetail(currentMemberId);
        }
    }
}

function saveData() {
    localStorage.setItem('gymMembers', JSON.stringify(members));
}

document.getElementById('add-member-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('new-name').value;
    const phone = document.getElementById('new-phone').value;
    const newMember = {
        id: Date.now(),
        name,
        phone,
        sessions: 0,
        debt: 0,
        transactions: [],
        createdAt: new Date().toISOString()
    };
    members.push(newMember);
    saveData();
    document.getElementById('new-name').value = '';
    document.getElementById('new-phone').value = '';
    alert('عضو با موفقیت اضافه شد');
    goBack();
});

function getMemberTotalSpent(member) {
    return member.transactions
        .filter(t => t.type === 'payment')
        .reduce((sum, t) => sum + t.amount, 0);
}

function getMemberTotalSessions(member) {
    return member.transactions
        .filter(t => t.type === 'checkin' || t.type === 'debt-session')
        .length;
}

function renderDashboard(filterText = '') {
    const list = document.getElementById('members-list');
    list.innerHTML = '';
    let totalDebt = 0;
    const sortType = document.getElementById('sort-members').value;
    
    let filteredMembers = members.filter(m =>
        m.name.includes(filterText) || m.phone.includes(filterText)
    );
    
    filteredMembers.sort((a, b) => {
        switch(sortType) {
            case 'newest': return b.id - a.id;
            case 'oldest': return a.id - b.id;
            case 'name': return a.name.localeCompare(b.name, 'fa');
            case 'sessions': return getMemberTotalSessions(b) - getMemberTotalSessions(a);
            case 'spent': return getMemberTotalSpent(b) - getMemberTotalSpent(a);
            case 'debt': return b.debt - a.debt;
            default: return 0;
        }
    });
    
    filteredMembers.forEach(member => {
        totalDebt += member.debt;
        const item = document.createElement('div');
        item.className = `member-item ${member.debt > 0 || member.sessions < 0 ? 'has-debt' : ''}`;
        item.onclick = () => openMemberDetail(member.id);
        let sessionDisplay = `${member.sessions} جلسه`;
        if(member.sessions < 0) {
            sessionDisplay = `${Math.abs(member.sessions)} جلسه بدهی`;
        }
        item.innerHTML = `
            <div class="member-info">
                <h4>${member.name}</h4>
                <p>${member.phone}</p>
            </div>
            <div class="member-status">
                <div class="badge">${sessionDisplay}</div>
                ${member.debt > 0 ? `<div class="badge debt">${member.debt.toLocaleString()} تومان</div>` : ''}
            </div>
        `;
        list.appendChild(item);
    });
    
    document.getElementById('total-members').innerText = members.length;
    document.getElementById('total-debt').innerText = totalDebt.toLocaleString() + ' تومان';
}

function searchMembers() {
    const text = document.getElementById('search-input').value;
    renderDashboard(text);
}

function openMemberDetail(id) {
    currentMemberId = id;
    const member = members.find(m => m.id === id);
    if(!member) return;
    document.getElementById('detail-name').innerText = member.name;
    document.getElementById('detail-phone').innerText = 'شماره: ' + member.phone;
    let sessionText = member.sessions;
    if(member.sessions < 0) sessionText = `${member.sessions} (بدهی)`;
    document.getElementById('detail-sessions').innerText = sessionText;
    document.getElementById('detail-debt').innerText = member.debt.toLocaleString() + ' تومان';
    renderHistory(member);
    showView('view-member-detail', member.name);
}

function renderHistory(member) {
    const historyList = document.getElementById('transaction-history');
    historyList.innerHTML = '';
    const recentTransactions = member.transactions.slice(-10).reverse();
    recentTransactions.forEach(t => {
        const div = document.createElement('div');
        div.className = `history-item type-${t.type}`;
        const date = new Date(t.date).toLocaleDateString('fa-IR');
        let desc = '';
        let amountClass = '';
        if(t.type === 'water') {
            desc = 'خرید آب';
            amountClass = 'color: var(--danger)';
        } else if (t.type === 'session') {
            desc = `خرید ${t.count || 1} جلسه`;
            amountClass = 'color: var(--success)';
        } else if (t.type === 'payment') {
            const purpose = t.purpose ? `(${t.purpose})` : '';
            desc = `پرداخت وجه ${purpose}`;
            amountClass = 'color: var(--success)';
        } else if (t.type === 'checkin') {
            desc = 'ثبت حضور';
            amountClass = 'color: var(--checkin)';
        } else if (t.type === 'debt-session') {
            desc = 'بدهی جلسه';
            amountClass = 'color: var(--danger)';
        }
        div.innerHTML = `
            <span>${desc} <small style="color:#9ca3af; display:block; margin-top:2px;">${date}</small></span>
            <span style="${amountClass}">${t.amount.toLocaleString()}</span>
        `;
        historyList.appendChild(div);
    });
}

function addTransaction(type) {
    const member = members.find(m => m.id === currentMemberId);
    if(!member) return;
    let amount = 0;
    let message = '';
    let count = 1;
    let purpose = '';
    if(type === 'water') {
        const inputAmount = prompt('مبلغ خرید آب (تومان):');
        if(!inputAmount) return;
        amount = parseInt(inputAmount);
        if(isNaN(amount)) return alert('مبلغ نامعتبر است');
        member.debt += amount;
        message = 'هزینه آب به بدهی اضافه شد';
    } else if (type === 'session') {
        const inputCount = prompt('تعداد جلسات:');
        if(!inputCount) return;
        count = parseInt(inputCount);
        if(isNaN(count) || count <= 0) return alert('تعداد نامعتبر است');
        const inputAmount = prompt(`مبلغ کل ${count} جلسه (تومان):`);
        if(!inputAmount) return;
        amount = parseInt(inputAmount);
        if(isNaN(amount)) return alert('مبلغ نامعتبر است');
        member.sessions += count;
        member.debt += amount;
        message = `${count} جلسه اضافه شد`;
    } else if (type === 'payment') {
        const inputAmount = prompt('مبلغ پرداختی (تومان):');
        if(!inputAmount) return;
        amount = parseInt(inputAmount);
        if(isNaN(amount)) return alert('مبلغ نامعتبر است');
        purpose = prompt('این پرداخت بابت چیست؟ (مثال: شهریه، آب، مکمل)');
        if(!purpose) purpose = 'بدون توضیح';
        member.debt -= amount;
        if(member.debt < 0) member.debt = 0;
        message = 'پرداخت ثبت شد';
    }
    member.transactions.push({
        type,
        amount,
        count: count > 1 ? count : null,
        purpose: purpose,
        date: new Date().toISOString()
    });
    saveData();
    alert(message);
    openMemberDetail(currentMemberId);
}

function checkInMember() {
    const member = members.find(m => m.id === currentMemberId);
    if(!member) return;
    const today = new Date().toISOString().split('T')[0];
    const alreadyCheckedIn = member.transactions.some(t => {
        const tDate = t.date.split('T')[0];
        return (t.type === 'checkin' || t.type === 'debt-session') && tDate === today;
    });
    if(alreadyCheckedIn) {
        alert('⚠️ این عضو امروز قبلاً حضور ثبت کرده است!');
        return;
    }
    if(member.sessions > 0) {
        member.sessions--;
        member.transactions.push({
            type: 'checkin',
            amount: 0,
            date: new Date().toISOString()
        });
        alert('حضور ثبت شد. یک جلسه کسر شد.');
    } else {
        const sessionPrice = prompt('هزینه این جلسه به صورت بدهی چقدر باشد؟ (تومان)');
        if(!sessionPrice) return;
        const amount = parseInt(sessionPrice);
        if(isNaN(amount)) return alert('مبلغ نامعتبر است');
        member.sessions--;
        member.debt += amount;
        member.transactions.push({
            type: 'debt-session',
            amount: amount,
            date: new Date().toISOString()
        });
        alert('حضور ثبت شد.\nهزینه جلسه به بدهی اضافه شد.');
    }
    saveData();
    openMemberDetail(currentMemberId);
}

function deleteMember() {
    const member = members.find(m => m.id === currentMemberId);
    if(!member) return;
    const confirmDelete = confirm(`⚠️ آیا مطمئن هستید؟\nعضو "${member.name}" به طور کامل حذف می‌شود.\n\nاگر اشتباهی حذف کردید، باید از فایل بک‌آپ بازگردانی کنید.`);
    if(confirmDelete) {
        members = members.filter(m => m.id !== currentMemberId);
        saveData();
        alert('عضو با موفقیت حذف شد.');
        goBack();
    }
}

function exportData() {
    const data = {
        members: members,
        date: new Date().toISOString()
    };
    const dataStr = JSON.stringify(data);
    const dataUri = 'application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'gym-backup-'+ new Date().toLocaleDateString('fa-IR').replace(/\//g, '-') +'.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    localStorage.setItem('lastBackupDate', new Date().toISOString());
    alert('فایل پشتیبان با موفقیت دانلود شد.\nاین فایل رو جای امنی نگه دار!');
    updateBackupStatus();
}

function importData(input) {
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if(data.members && Array.isArray(data.members)) {
                if(confirm('آیا مطمئن هستید؟ تمام اطلاعات فعلی با اطلاعات فایل بک‌آپ جایگزین می‌شود.')) {
                    members = data.members;
                    saveData();
                    localStorage.setItem('lastBackupDate', new Date().toISOString());
                    alert('اطلاعات با موفقیت بازگردانی شد.');
                    location.reload();
                }
            } else {
                alert('فایل نامعتبر است.');
            }
        } catch(err) {
            alert('خطا در خواندن فایل.');
        }
    };
    reader.readAsText(file);
    input.value = '';
}

function updateBackupStatus() {
    const lastBackup = localStorage.getItem('lastBackupDate');
    const statusEl = document.getElementById('backup-status');
    if(!lastBackup) {
        statusEl.innerText = '⚠️ هنوز بک‌آپ نگرفته‌اید!';
        statusEl.className = 'backup-status red';
        return;
    }
    const lastDate = new Date(lastBackup);
    const now = new Date();
    const diffTime = Math.abs(now - lastDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if(diffDays <= 3) {
        statusEl.innerText = `✅ آخرین بک‌آپ: ${diffDays} روز پیش`;
        statusEl.className = 'backup-status green';
    } else if(diffDays <= 7) {
        statusEl.innerText = `⚠️ آخرین بک‌آپ: ${diffDays} روز پیش`;
        statusEl.className = 'backup-status yellow';
    } else {
        statusEl.innerText = `❌ آخرین بک‌آپ: ${diffDays} روز پیش (قدیمی!)`;
        statusEl.className = 'backup-status red';
    }
}

function showMonthlyReport() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let totalPayments = 0;
    let transactionCount = 0;
    let debtRemaining = 0;
    let debtPaid = 0;
    const reportTransactions = [];
    const memberReports = [];
    
    members.forEach(member => {
        let memberSessions = 0;
        let memberPayments = 0;
        let memberTransactions = [];
        
        member.transactions.forEach(t => {
            const tDate = new Date(t.date);
            if(tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
                if(t.type === 'payment') {
                    totalPayments += t.amount;
                    memberPayments += t.amount;
                    transactionCount++;
                    reportTransactions.push({
                        member: member.name,
                        memberId: member.id,
                        amount: t.amount,
                        purpose: t.purpose,
                        date: t.date,
                        type: 'payment'
                    });
                } else if(t.type === 'checkin' || t.type === 'debt-session') {
                    memberSessions++;
                }
                
                memberTransactions.push({
                    type: t.type,
                    amount: t.amount,
                    purpose: t.purpose,
                    date: t.date,
                    count: t.count
                });
            }
        });
        
        // محاسبه بدهی مانده و پرداخت شده برای اعضایی که فعالیت داشتن
        if(memberSessions > 0 || memberPayments > 0) {
            memberReports.push({
                id: member.id,
                name: member.name,
                phone: member.phone,
                sessions: memberSessions,
                payments: memberPayments,
                debt: member.debt,
                transactions: memberTransactions
            });
            
            // بدهی مانده از اعضایی که این ماه فعالیت داشتن
            debtRemaining += member.debt;
            // بدهی پرداخت شده = کل پرداختی‌های این ماه
            debtPaid += memberPayments;
        }
    });
    
    currentReportData = { members: memberReports, transactions: reportTransactions };
    
    document.getElementById('report-month').innerText =
        `گزارش ${now.toLocaleDateString('fa-IR', { month: 'long', year: 'numeric' })}`;
    document.getElementById('report-total').innerText = totalPayments.toLocaleString() + ' تومان';
    document.getElementById('report-count').innerText = transactionCount;
    document.getElementById('report-debt-remaining').innerText = debtRemaining.toLocaleString() + ' تومان';
    document.getElementById('report-debt-paid').innerText = debtPaid.toLocaleString() + ' تومان';
    
    updateSortButtons();
    renderReportMembers();
    renderReportTransactions();
    
    showView('view-monthly-report', 'گزارش ماهانه');
}

function renderReportMembers() {
    const membersListEl = document.getElementById('report-members-list');
    membersListEl.innerHTML = '';
    const sortType = document.getElementById('sort-report-members').value;
    
    let sortedMembers = [...currentReportData.members];
    
    sortedMembers.sort((a, b) => {
        switch(sortType) {
            case 'sessions-desc': return b.sessions - a.sessions;
            case 'sessions-asc': return a.sessions - b.sessions;
            case 'name': return a.name.localeCompare(b.name, 'fa');
            case 'payment-desc': return b.payments - a.payments;
            case 'payment-asc': return a.payments - b.payments;
            default: return 0;
        }
    });
    
    sortedMembers.forEach(m => {
        const div = document.createElement('div');
        div.className = 'report-member-item';
        div.onclick = () => showMemberReportDetail(m);
        div.innerHTML = `
            <div class="report-member-info">
                <h4>${m.name}</h4>
                <p style="font-size: 0.8rem; color: #6b7280;">${m.phone}</p>
            </div>
            <div class="report-member-stats">
                <div class="badge sessions">${m.sessions} جلسه</div>
                ${m.payments > 0 ? `<div class="badge">${m.payments.toLocaleString()} تومان</div>` : ''}
            </div>
        `;
        membersListEl.appendChild(div);
    });
    
    if(sortedMembers.length === 0) {
        membersListEl.innerHTML = '<p style="text-align: center; color: #666; padding: 1rem;">هیچ فعالیتی در این ماه ثبت نشده است.</p>';
    }
}

function renderReportTransactions() {
    const detailsEl = document.getElementById('report-details');
    detailsEl.innerHTML = '';
    const sortType = document.getElementById('sort-report-transactions').value;
    
    let sortedTransactions = [...currentReportData.transactions];
    
    sortedTransactions.sort((a, b) => {
        switch(sortType) {
            case 'newest': return new Date(b.date) - new Date(a.date);
            case 'oldest': return new Date(a.date) - new Date(b.date);
            case 'amount-asc': return a.amount - b.amount;
            case 'amount-desc': return b.amount - a.amount;
            case 'name': return a.member.localeCompare(b.member, 'fa');
            default: return 0;
        }
    });
    
    sortedTransactions.forEach(r => {
        const div = document.createElement('div');
        div.className = 'history-item type-payment';
        const date = new Date(r.date).toLocaleDateString('fa-IR');
        div.innerHTML = `
            <span>${r.member} <small>(${r.purpose})</small> <small style="color:#9ca3af; display:block; margin-top:2px;">${date}</small></span>
            <span style="color: var(--success)">${r.amount.toLocaleString()}</span>
        `;
        detailsEl.appendChild(div);
    });
    
    if(sortedTransactions.length === 0) {
        detailsEl.innerHTML = '<p style="text-align: center; color: #666; padding: 1rem;">هیچ پرداختی در این ماه ثبت نشده است.</p>';
    }
}

function showMemberReportDetail(memberData) {
    document.getElementById('report-member-name').innerText = memberData.name;
    document.getElementById('report-member-phone').innerText = 'شماره: ' + memberData.phone;
    document.getElementById('report-member-sessions').innerText = memberData.sessions;
    document.getElementById('report-member-payment').innerText = memberData.payments.toLocaleString() + ' تومان';
    
    const transactionsEl = document.getElementById('report-member-transactions');
    transactionsEl.innerHTML = '';
    
    memberData.transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(t => {
        const div = document.createElement('div');
        div.className = `history-item type-${t.type}`;
        const date = new Date(t.date).toLocaleDateString('fa-IR');
        
        let desc = '';
        let amountClass = '';
        
        if(t.type === 'water') {
            desc = 'خرید آب';
            amountClass = 'color: var(--danger)';
        } else if (t.type === 'session') {
            desc = `خرید ${t.count || 1} جلسه`;
            amountClass = 'color: var(--success)';
        } else if (t.type === 'payment') {
            const purpose = t.purpose ? `(${t.purpose})` : '';
            desc = `پرداخت وجه ${purpose}`;
            amountClass = 'color: var(--success)';
        } else if (t.type === 'checkin') {
            desc = 'ثبت حضور';
            amountClass = 'color: var(--checkin)';
        } else if (t.type === 'debt-session') {
            desc = 'بدهی جلسه';
            amountClass = 'color: var(--danger)';
        }
        
        div.innerHTML = `
            <span>${desc} <small style="color:#9ca3af; display:block; margin-top:2px;">${date}</small></span>
            <span style="${amountClass}">${t.amount.toLocaleString()}</span>
        `;
        transactionsEl.appendChild(div);
    });
    
    showView('view-member-report-detail', memberData.name);
}

async function checkForUpdate(showAlert = true) {
    const btn = document.querySelector('.btn-update');
    if(btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '⏳ در حال بررسی...';
        btn.disabled = true;
    }
    
    try {
        const response = await fetch('version.json?t=' + Date.now());
        const data = await response.json();
        const currentVersion = APP_VERSION;
        const newVersion = data.version;
        
        localStorage.setItem('appVersion', newVersion);
        APP_VERSION = newVersion;
        
        if(parseFloat(newVersion) > parseFloat(currentVersion)) {
            if(confirm(`نسخه فعلی: ${currentVersion}\nنسخه جدید: ${newVersion}\n\nآیا می‌خواهید آپدیت کنید؟`)) {
                if('serviceWorker' in navigator) {
                    const registration = await navigator.serviceWorker.ready;
                    await registration.unregister();
                }
                caches.keys().then(names => {
                    names.forEach(name => caches.delete(name));
                });
                localStorage.setItem('pendingUpdate', 'true');
                window.location.reload(true);
            }
        } else {
            if(showAlert) {
                alert(`✅ شما از آخرین نسخه استفاده می‌کنید!\nنسخه فعلی: ${currentVersion}`);
            }
        }
    } catch(err) {
        if(showAlert) {
            alert('❌ خطا در بررسی آپدیت\nمطمئن شوید به اینترنت متصل هستید');
        }
    }
    
    if(btn) {
        btn.innerHTML = '🔄 بررسی آپدیت';
        btn.disabled = false;
    }
}

if(localStorage.getItem('pendingUpdate') === 'true') {
    localStorage.removeItem('pendingUpdate');
    localStorage.setItem('appVersion', '1.0.1');
}

if('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}