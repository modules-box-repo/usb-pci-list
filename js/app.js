// Handles UI, tab switching and data fetching
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    const usbContainer = document.getElementById('usbContainer');
    const pciContainer = document.getElementById('pciContainer');
    
    const btnUsb = document.getElementById('btnUsb');
    const btnPci = document.getElementById('btnPci');
    const fragUsb = document.getElementById('fragUsb');
    const fragPci = document.getElementById('fragPci');

    let lastUsbData = '';
    let lastPciData = '';
    let currentTab = 'usb';

    const toggleTheme = () => {
        const root = document.documentElement;
        const currentTheme = root.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        root.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    };

    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.addEventListener('click', toggleTheme);

    const switchTab = (tab) => {
        currentTab = tab;
        if (tab === 'usb') {
            btnUsb.classList.add('active');
            btnPci.classList.remove('active');
            fragUsb.classList.add('active');
            fragPci.classList.remove('active');
        } else {
            btnPci.classList.add('active');
            btnUsb.classList.remove('active');
            fragPci.classList.add('active');
            fragUsb.classList.remove('active');
        }
    };

    btnUsb.addEventListener('click', () => switchTab('usb'));
    btnPci.addEventListener('click', () => switchTab('pci'));

    const fetchData = async (url, container, lastDataRef, renderFunc, typeName, btnElement) => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed');
            
            const data = await response.json();
            const dataString = JSON.stringify(data);
            
            if (dataString !== lastDataRef.value) {
                lastDataRef.value = dataString;
                renderFunc(data, container);
                
                let count = Array.isArray(data) ? data.length : 0;
                if (count === 1 && data[0].raw && data[0].raw.startsWith('Error:')) {
                    count = 0;
                }
                btnElement.textContent = `${typeName === 'USB' ? 'USB' : 'PCI'} Devices (${count})`;
            }
        } catch (error) {
            if (!lastDataRef.value) {
                container.innerHTML = `<div class="error-msg">Failed to load ${typeName} devices.</div>`;
                btnElement.textContent = `${typeName === 'USB' ? 'USB' : 'PCI'} Devices (0)`;
            }
        }
    };

    const renderUsbList = (devices, container) => {
        if (!devices || devices.length === 0) {
            container.innerHTML = '<div class="empty-msg">No USB devices found.</div>';
            return;
        }

        container.innerHTML = devices.map(device => {
            if (device.bus && device.device) {
                return `
                    <div class="device-card">
                        <h3 class="device-name">${escapeHtml(device.name || 'Unknown Device')}</h3>
                        <div class="device-details">
                            <div class="device-detail-item">
                                <span class="device-detail-label">Bus</span>
                                <span class="device-detail-value">${escapeHtml(device.bus)}</span>
                            </div>
                            <div class="device-detail-item">
                                <span class="device-detail-label">Device</span>
                                <span class="device-detail-value">${escapeHtml(device.device)}</span>
                            </div>
                            <div class="device-detail-item">
                                <span class="device-detail-label">ID</span>
                                <span class="device-detail-value">${escapeHtml(device.id)}</span>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                return renderRawCard(device);
            }
        }).join('');
    };

    const renderPciList = (devices, container) => {
        if (!devices || devices.length === 0) {
            container.innerHTML = '<div class="empty-msg">No PCI devices found.</div>';
            return;
        }

        container.innerHTML = devices.map(device => {
            if (device.slot && device.name) {
                return `
                    <div class="device-card">
                        <h3 class="device-name">${escapeHtml(device.name || 'Unknown Device')}</h3>
                        <div class="device-details">
                            <div class="device-detail-item">
                                <span class="device-detail-label">Slot</span>
                                <span class="device-detail-value">${escapeHtml(device.slot)}</span>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                return renderRawCard(device);
            }
        }).join('');
    };

    const renderRawCard = (device) => {
        return `
            <div class="device-card">
                <h3 class="device-name">Device</h3>
                <div class="device-details">
                    <div class="device-detail-item">
                        <span class="device-detail-label">Raw Info</span>
                        <span class="device-detail-value">${escapeHtml(device.raw || device.error || 'Unknown')}</span>
                    </div>
                </div>
            </div>
        `;
    };

    const escapeHtml = (unsafe) => {
        return (unsafe || '').toString()
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    };

    const lastUsbRef = { value: '' };
    const lastPciRef = { value: '' };

    const fetchAllData = () => {
        fetchData('/api/usb', usbContainer, lastUsbRef, renderUsbList, 'USB', btnUsb);
        fetchData('/api/pci', pciContainer, lastPciRef, renderPciList, 'PCI', btnPci);
    };

    fetchAllData();
    setInterval(fetchAllData, 500);
});
