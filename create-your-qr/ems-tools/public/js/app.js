// EMS Integration Toolkit - Main Application Logic

// ==========================================
// TOAST NOTIFICATION SYSTEM
// ==========================================
const ToastManager = {
    container: null,

    init() {
        this.container = document.getElementById('toastContainer');
    },

    show(type, title, message, duration = 5000) {
        const icons = {
            success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
            error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
            info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">${icons[type]}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;

        this.container.appendChild(toast);

        if (duration > 0) {
            setTimeout(() => {
                toast.style.animation = 'slideOut 0.3s ease forwards';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        return toast;
    },

    success(title, message) { return this.show('success', title, message); },
    error(title, message) { return this.show('error', title, message, 8000); },
    warning(title, message) { return this.show('warning', title, message, 6000); },
    info(title, message) { return this.show('info', title, message); }
};

// ==========================================
// VALIDATION UTILITIES
// ==========================================
const Validator = {
    setError(inputId, message) {
        const input = document.getElementById(inputId);
        if (!input) return;

        input.classList.add('input-error');
        input.classList.remove('input-success');

        // Remove existing error message
        const existing = input.parentElement.querySelector('.error-text');
        if (existing) existing.remove();

        // Add error message
        const errorEl = document.createElement('div');
        errorEl.className = 'error-text';
        errorEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>${message}`;
        input.parentElement.appendChild(errorEl);
    },

    clearError(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;

        input.classList.remove('input-error');
        const existing = input.parentElement.querySelector('.error-text');
        if (existing) existing.remove();
    },

    setSuccess(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;

        input.classList.remove('input-error');
        input.classList.add('input-success');

        const existing = input.parentElement.querySelector('.error-text');
        if (existing) existing.remove();
    },

    isEmpty(value) {
        return !value || value.trim() === '';
    },

    isValidOid(oid) {
        return /^[0-9]+(\.[0-9]+)*$/.test(oid);
    },

    isValidJson(str) {
        try {
            JSON.parse(str);
            return { valid: true };
        } catch (e) {
            return { valid: false, error: e.message, position: this.getJsonErrorPosition(e.message) };
        }
    },

    getJsonErrorPosition(errorMsg) {
        const match = errorMsg.match(/position\s+(\d+)/i);
        return match ? parseInt(match[1]) : null;
    },

    isValidXml(str) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(str, 'text/xml');
        const parseError = doc.querySelector('parsererror');
        if (parseError) {
            return { valid: false, error: parseError.textContent };
        }
        return { valid: true, doc };
    }
};

// ==========================================
// CLIPBOARD UTILITY
// ==========================================
async function copyToClipboard(text, successMsg = 'Copied to clipboard!') {
    if (!text || text.trim() === '') {
        ToastManager.warning('Nothing to Copy', 'The output is empty.');
        return false;
    }

    try {
        await navigator.clipboard.writeText(text);
        ToastManager.success('Copied!', successMsg);
        return true;
    } catch (err) {
        // Fallback for older browsers
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            ToastManager.success('Copied!', successMsg);
            return true;
        } catch (fallbackErr) {
            ToastManager.error('Copy Failed', 'Please select the text and copy manually (Ctrl+C).');
            return false;
        }
    }
}

// ==========================================
// LOCAL STORAGE UTILITY
// ==========================================
const Storage = {
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            ToastManager.error('Storage Error', 'Could not read from browser storage.');
            return defaultValue;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                ToastManager.error('Storage Full', 'Browser storage is full. Please export and clear some data.');
            } else {
                ToastManager.error('Storage Error', 'Could not save to browser storage.');
            }
            return false;
        }
    }
};

// ==========================================
// Initialize Toast Manager
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    ToastManager.init();
});

// ==========================================
// Tool Navigation
// ==========================================
document.querySelectorAll('.tool-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tool-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tool + 'Panel').classList.add('active');
    });
});

// ==========================================
// TL1 PARSER/BUILDER
// ==========================================
let currentTl1Format = 'json';
let lastParsedTl1Data = null;

// Mode switching
document.querySelectorAll('#tl1Panel .mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#tl1Panel .mode-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('#tl1Panel .mode-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tl1' + btn.dataset.mode.charAt(0).toUpperCase() + btn.dataset.mode.slice(1) + 'Mode').classList.add('active');
    });
});

// Output format switching
document.querySelectorAll('#tl1ParseMode .format-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#tl1ParseMode .format-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTl1Format = btn.dataset.format;
        if (lastParsedTl1Data) {
            renderTl1Output(lastParsedTl1Data);
        }
    });
});

// Parse TL1 Response
document.getElementById('tl1ParseBtn').addEventListener('click', () => {
    const input = document.getElementById('tl1Input').value.trim();

    if (Validator.isEmpty(input)) {
        Validator.setError('tl1Input', 'Please enter a TL1 response to parse');
        ToastManager.warning('Empty Input', 'Please paste a TL1 response to parse.');
        return;
    }

    Validator.clearError('tl1Input');

    try {
        const parsed = parseTl1Response(input);

        if (!parsed.header.tid && !parsed.status && parsed.data.length === 0) {
            ToastManager.warning('Parse Warning', 'Could not identify TL1 structure. Check the format.');
            showTl1FormatHint();
        } else if (parsed.data.length === 0) {
            ToastManager.info('No Data Rows', 'Header parsed but no data rows found in response.');
        } else {
            ToastManager.success('Parsed Successfully', `Found ${parsed.data.length} data row(s).`);
        }

        lastParsedTl1Data = parsed;
        renderTl1Output(parsed);
    } catch (err) {
        ToastManager.error('Parse Error', err.message);
        showTl1FormatHint();
    }
});

function showTl1FormatHint() {
    const output = document.getElementById('tl1Output');
    output.innerHTML = `
        <div class="error-hint">
            <div class="error-hint-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Expected TL1 Format
            </div>
            <div class="error-hint-content">
                <p>TL1 response should follow this structure:</p>
                <code>TID DATE TIME</code><br>
                <code>M  CTAG COMPLD</code><br>
                <code>   "AID::PARAM=VALUE,PARAM=VALUE:STATE"</code><br>
                <code>;</code><br><br>
                <p>Click "Load Sample" to see an example.</p>
            </div>
        </div>
    `;
}

function parseTl1Response(response) {
    const lines = response.split('\n');
    const result = {
        header: {},
        status: '',
        ctag: '',
        data: []
    };

    // Parse header (first line typically: TID DATE TIME)
    const headerLine = lines[0].trim();
    const headerMatch = headerLine.match(/^(\S+)\s+(\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/);
    if (headerMatch) {
        result.header = {
            tid: headerMatch[1],
            date: headerMatch[2],
            time: headerMatch[3]
        };
    }

    // Find response code line (M/A/R followed by CTAG and status)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        const statusMatch = line.match(/^([MAR])\s+(\d+)\s+(\w+)/);
        if (statusMatch) {
            result.responseType = statusMatch[1];
            result.ctag = statusMatch[2];
            result.status = statusMatch[3];
            break;
        }
    }

    // Parse data blocks (lines starting with ")
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
            const dataLine = trimmed.slice(1, -1);
            const parsed = parseTl1DataLine(dataLine);
            if (parsed) {
                result.data.push(parsed);
            }
        }
    }

    return result;
}

function parseTl1DataLine(line) {
    const parts = line.split(':');
    if (parts.length < 1) return null;

    const result = {
        aid: parts[0] || '',
        params: {},
        state: ''
    };

    if (parts.length >= 3) {
        const paramStr = parts[2];
        if (paramStr) {
            const paramPairs = paramStr.split(',');
            for (const pair of paramPairs) {
                const [key, value] = pair.split('=');
                if (key && value !== undefined) {
                    result.params[key.trim()] = value.trim();
                }
            }
        }
    }

    if (parts.length >= 4) {
        result.state = parts[3];
    }

    return result;
}

function renderTl1Output(data) {
    const output = document.getElementById('tl1Output');

    switch (currentTl1Format) {
        case 'json':
            output.innerHTML = syntaxHighlightJson(JSON.stringify(data, null, 2));
            break;
        case 'table':
            output.innerHTML = renderTl1Table(data);
            break;
        case 'csv':
            output.textContent = renderTl1Csv(data);
            break;
    }
}

function renderTl1Table(data) {
    if (!data.data || data.data.length === 0) {
        return `<div class="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            <h4>No Data Records</h4>
            <p>No data rows found in the TL1 response.</p>
        </div>`;
    }

    const allKeys = new Set();
    data.data.forEach(row => {
        Object.keys(row.params).forEach(key => allKeys.add(key));
    });
    const keys = Array.from(allKeys);

    let html = '<table style="width:100%;border-collapse:collapse;font-size:12px;">';
    html += '<tr style="background:var(--bg-input);"><th style="padding:8px;text-align:left;border:1px solid var(--border);">AID</th>';
    keys.forEach(key => {
        html += `<th style="padding:8px;text-align:left;border:1px solid var(--border);">${key}</th>`;
    });
    html += '<th style="padding:8px;text-align:left;border:1px solid var(--border);">State</th></tr>';

    data.data.forEach(row => {
        html += `<tr><td style="padding:8px;border:1px solid var(--border);">${row.aid}</td>`;
        keys.forEach(key => {
            html += `<td style="padding:8px;border:1px solid var(--border);">${row.params[key] || ''}</td>`;
        });
        html += `<td style="padding:8px;border:1px solid var(--border);">${row.state}</td></tr>`;
    });

    html += '</table>';
    return html;
}

function renderTl1Csv(data) {
    if (!data.data || data.data.length === 0) {
        return 'No data records found';
    }

    const allKeys = new Set();
    data.data.forEach(row => {
        Object.keys(row.params).forEach(key => allKeys.add(key));
    });
    const keys = Array.from(allKeys);

    let csv = 'AID,' + keys.join(',') + ',State\n';
    data.data.forEach(row => {
        csv += row.aid + ',';
        csv += keys.map(key => row.params[key] || '').join(',');
        csv += ',' + row.state + '\n';
    });

    return csv;
}

// TL1 Command Builder
document.getElementById('tl1GenerateBtn').addEventListener('click', () => {
    const command = document.getElementById('tl1Command').value;
    const entity = document.getElementById('tl1Entity').value.trim().toUpperCase();
    const tid = document.getElementById('tl1Tid').value.trim();
    const aid = document.getElementById('tl1Aid').value.trim();
    const ctag = document.getElementById('tl1Ctag').value.trim() || Math.floor(Math.random() * 99999);
    const params = document.getElementById('tl1Params').value.trim();

    // Validation
    let hasError = false;

    if (Validator.isEmpty(entity)) {
        Validator.setError('tl1Entity', 'Entity type is required (e.g., EQPT, OTU, ODU)');
        hasError = true;
    } else {
        Validator.clearError('tl1Entity');
    }

    if (hasError) {
        ToastManager.warning('Validation Error', 'Please fill in required fields.');
        return;
    }

    let tl1Command = `${command}-${entity}:${tid}:${aid}:${ctag}`;
    if (params) {
        tl1Command += `::${params}`;
    }
    tl1Command += ';';

    document.getElementById('tl1GeneratedOutput').textContent = tl1Command;
    ToastManager.success('Command Generated', 'TL1 command is ready to copy.');
});

// Sample TL1 Data
document.getElementById('tl1SampleBtn').addEventListener('click', () => {
    document.getElementById('tl1Input').value = `   NE-WEST-01 2024-01-15 14:30:45
M  12345 COMPLD
   "SLOT-1-1::PROVISIONEDTYPE=OTU4,ADMINSTATE=IS,OPERSTATE=IS:IS-NR"
   "SLOT-1-2::PROVISIONEDTYPE=OTU4,ADMINSTATE=IS,OPERSTATE=IS:IS-NR"
   "SLOT-1-3::PROVISIONEDTYPE=ODU4,ADMINSTATE=OOS,OPERSTATE=OOS:OOS-MA"
   "SLOT-2-1::PROVISIONEDTYPE=ETH100G,ADMINSTATE=IS,OPERSTATE=IS:IS-NR"
   "SLOT-2-2::PROVISIONEDTYPE=ETH100G,ADMINSTATE=IS,OPERSTATE=DSBLD:OOS-AUMA"
;`;
    Validator.clearError('tl1Input');
    ToastManager.info('Sample Loaded', 'Sample TL1 response loaded. Click Parse to process.');
});

// Clear TL1
document.getElementById('tl1ClearBtn').addEventListener('click', () => {
    document.getElementById('tl1Input').value = '';
    document.getElementById('tl1Output').innerHTML = '';
    lastParsedTl1Data = null;
    Validator.clearError('tl1Input');
});

// Copy TL1 output
document.getElementById('tl1CopyBtn').addEventListener('click', () => {
    const output = document.getElementById('tl1Output');
    copyToClipboard(output.textContent || output.innerText, 'TL1 output copied!');
});

document.getElementById('tl1CopyGenBtn').addEventListener('click', () => {
    const output = document.getElementById('tl1GeneratedOutput');
    copyToClipboard(output.textContent, 'TL1 command copied!');
});

// ==========================================
// ALARM MAPPER
// ==========================================
let alarmMappings = Storage.get('alarmMappings', []);

function renderAlarmMappings() {
    const container = document.getElementById('mappingRows');
    const searchTerm = document.getElementById('alarmSearch').value.toLowerCase();

    const filtered = alarmMappings.filter(m =>
        m.emsId.toLowerCase().includes(searchTerm) ||
        m.emsName.toLowerCase().includes(searchTerm) ||
        m.ossId.toLowerCase().includes(searchTerm) ||
        m.ossName.toLowerCase().includes(searchTerm)
    );

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <h4>No Alarm Mappings</h4>
            <p>${searchTerm ? 'No results match your search.' : 'Add your first alarm mapping above.'}</p>
        </div>`;
        return;
    }

    container.innerHTML = filtered.map((mapping, index) => `
        <div class="table-row" data-index="${alarmMappings.indexOf(mapping)}">
            <div>
                <div style="font-weight:500;">${escapeHtml(mapping.emsId)}</div>
                <div style="font-size:11px;color:var(--text-secondary);">${escapeHtml(mapping.emsName)}</div>
            </div>
            <div>
                <div style="font-weight:500;">${escapeHtml(mapping.ossId)}</div>
                <div style="font-size:11px;color:var(--text-secondary);">${escapeHtml(mapping.ossName)}</div>
            </div>
            <div>
                <span class="severity-badge ${mapping.severity.toLowerCase()}">${mapping.severity}</span>
            </div>
            <div class="row-actions">
                <button class="btn-icon delete" onclick="deleteMapping(${alarmMappings.indexOf(mapping)})" title="Delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.deleteMapping = function(index) {
    if (confirm('Delete this alarm mapping?')) {
        alarmMappings.splice(index, 1);
        if (Storage.set('alarmMappings', alarmMappings)) {
            renderAlarmMappings();
            ToastManager.success('Deleted', 'Alarm mapping removed.');
        }
    }
};

document.getElementById('addMappingBtn').addEventListener('click', () => {
    const emsId = document.getElementById('emsAlarmId').value.trim();
    const ossId = document.getElementById('ossAlarmId').value.trim();

    // Validation
    let hasError = false;

    if (Validator.isEmpty(emsId)) {
        Validator.setError('emsAlarmId', 'EMS Alarm ID is required');
        hasError = true;
    } else {
        Validator.clearError('emsAlarmId');
    }

    if (Validator.isEmpty(ossId)) {
        Validator.setError('ossAlarmId', 'OSS Alarm ID is required');
        hasError = true;
    } else {
        Validator.clearError('ossAlarmId');
    }

    if (hasError) {
        ToastManager.warning('Validation Error', 'Please fill in required fields.');
        return;
    }

    // Check for duplicates
    const duplicate = alarmMappings.find(m => m.emsId.toLowerCase() === emsId.toLowerCase());
    if (duplicate) {
        if (!confirm(`EMS Alarm ID "${emsId}" already exists. Add anyway?`)) {
            return;
        }
    }

    const mapping = {
        emsId: emsId,
        emsName: document.getElementById('emsAlarmName').value.trim(),
        ossId: ossId,
        ossName: document.getElementById('ossAlarmName').value.trim(),
        severity: document.getElementById('alarmSeverity').value,
        category: document.getElementById('alarmCategory').value,
        description: document.getElementById('alarmDescription').value.trim()
    };

    alarmMappings.push(mapping);

    if (Storage.set('alarmMappings', alarmMappings)) {
        renderAlarmMappings();
        ToastManager.success('Mapping Added', `Added mapping: ${emsId} → ${ossId}`);

        // Clear form
        document.getElementById('emsAlarmId').value = '';
        document.getElementById('emsAlarmName').value = '';
        document.getElementById('ossAlarmId').value = '';
        document.getElementById('ossAlarmName').value = '';
        document.getElementById('alarmDescription').value = '';
    }
});

document.getElementById('alarmSearch').addEventListener('input', renderAlarmMappings);

document.getElementById('exportMappingBtn').addEventListener('click', () => {
    if (alarmMappings.length === 0) {
        ToastManager.warning('Nothing to Export', 'No alarm mappings to export.');
        return;
    }

    try {
        const blob = new Blob([JSON.stringify(alarmMappings, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'alarm-mappings.json';
        a.click();
        URL.revokeObjectURL(url);
        ToastManager.success('Exported', `Exported ${alarmMappings.length} alarm mapping(s).`);
    } catch (err) {
        ToastManager.error('Export Failed', err.message);
    }
});

document.getElementById('importMappingBtn').addEventListener('click', () => {
    document.getElementById('importMappingFile').click();
});

document.getElementById('importMappingFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.json') && !file.name.endsWith('.csv')) {
        ToastManager.error('Invalid File', 'Please select a JSON or CSV file.');
        e.target.value = '';
        return;
    }

    // Validate file size (max 1MB)
    if (file.size > 1024 * 1024) {
        ToastManager.error('File Too Large', 'Maximum file size is 1MB.');
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const imported = JSON.parse(event.target.result);

            if (!Array.isArray(imported)) {
                throw new Error('File must contain an array of alarm mappings.');
            }

            // Validate structure
            const validMappings = imported.filter(m => m.emsId && m.ossId);
            if (validMappings.length === 0) {
                throw new Error('No valid mappings found. Each mapping must have emsId and ossId.');
            }

            if (validMappings.length < imported.length) {
                ToastManager.warning('Partial Import', `${imported.length - validMappings.length} invalid entries were skipped.`);
            }

            alarmMappings = [...alarmMappings, ...validMappings];

            if (Storage.set('alarmMappings', alarmMappings)) {
                renderAlarmMappings();
                ToastManager.success('Imported', `Imported ${validMappings.length} mapping(s).`);
            }
        } catch (err) {
            ToastManager.error('Import Failed', err.message);
        }
    };

    reader.onerror = () => {
        ToastManager.error('Read Error', 'Could not read the file.');
    };

    reader.readAsText(file);
    e.target.value = '';
});

document.getElementById('clearMappingBtn').addEventListener('click', () => {
    if (alarmMappings.length === 0) {
        ToastManager.info('Already Empty', 'No mappings to clear.');
        return;
    }

    if (confirm(`Clear all ${alarmMappings.length} alarm mapping(s)? This cannot be undone.`)) {
        alarmMappings = [];
        if (Storage.set('alarmMappings', alarmMappings)) {
            renderAlarmMappings();
            ToastManager.success('Cleared', 'All alarm mappings removed.');
        }
    }
});

// Initialize alarm mappings display
renderAlarmMappings();

// ==========================================
// PAYLOAD TRANSFORMER
// ==========================================
document.getElementById('transformBtn').addEventListener('click', () => {
    const input = document.getElementById('transformInput').value.trim();
    const inputFormat = document.getElementById('inputFormat').value;
    const outputFormat = document.getElementById('outputFormat').value;

    if (Validator.isEmpty(input)) {
        Validator.setError('transformInput', 'Please enter data to transform');
        ToastManager.warning('Empty Input', 'Please enter data to transform.');
        return;
    }

    Validator.clearError('transformInput');

    try {
        // Parse input
        let data;
        switch (inputFormat) {
            case 'json':
                const jsonResult = Validator.isValidJson(input);
                if (!jsonResult.valid) {
                    throw new Error(`Invalid JSON: ${jsonResult.error}`);
                }
                data = JSON.parse(input);
                break;
            case 'xml':
                const xmlResult = Validator.isValidXml(input);
                if (!xmlResult.valid) {
                    throw new Error(`Invalid XML: ${xmlResult.error}`);
                }
                data = xmlToJson(input);
                break;
            case 'csv':
                data = csvToJson(input);
                break;
            case 'yaml':
                if (typeof jsyaml === 'undefined') {
                    throw new Error('YAML library not loaded. Please refresh the page.');
                }
                data = jsyaml.load(input);
                break;
        }

        // Convert to output format
        let output;
        switch (outputFormat) {
            case 'json':
                output = JSON.stringify(data, null, 2);
                document.getElementById('transformOutput').innerHTML = syntaxHighlightJson(output);
                break;
            case 'xml':
                output = jsonToXml(data);
                document.getElementById('transformOutput').innerHTML = syntaxHighlightXml(output);
                break;
            case 'csv':
                output = jsonToCsv(data);
                document.getElementById('transformOutput').textContent = output;
                break;
            case 'yaml':
                output = jsyaml.dump(data);
                document.getElementById('transformOutput').textContent = output;
                break;
        }

        ToastManager.success('Transformed', `${inputFormat.toUpperCase()} → ${outputFormat.toUpperCase()}`);
    } catch (err) {
        document.getElementById('transformOutput').innerHTML = `
            <div class="error-hint">
                <div class="error-hint-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    Transformation Error
                </div>
                <div class="error-hint-content">
                    <p>${escapeHtml(err.message)}</p>
                </div>
            </div>
        `;
        ToastManager.error('Transform Failed', 'Check your input format.');
    }
});

// XML to JSON conversion
function xmlToJson(xml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');

    const parseError = doc.querySelector('parsererror');
    if (parseError) {
        throw new Error('Invalid XML structure');
    }

    function nodeToJson(node) {
        const obj = {};

        if (node.attributes && node.attributes.length > 0) {
            obj['@attributes'] = {};
            for (const attr of node.attributes) {
                obj['@attributes'][attr.name] = attr.value;
            }
        }

        if (node.hasChildNodes()) {
            for (const child of node.childNodes) {
                if (child.nodeType === Node.TEXT_NODE) {
                    const text = child.textContent.trim();
                    if (text) {
                        if (Object.keys(obj).length === 0) {
                            return text;
                        }
                        obj['#text'] = text;
                    }
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    const childObj = nodeToJson(child);
                    if (obj[child.nodeName]) {
                        if (!Array.isArray(obj[child.nodeName])) {
                            obj[child.nodeName] = [obj[child.nodeName]];
                        }
                        obj[child.nodeName].push(childObj);
                    } else {
                        obj[child.nodeName] = childObj;
                    }
                }
            }
        }

        return Object.keys(obj).length === 0 ? '' : obj;
    }

    return { [doc.documentElement.nodeName]: nodeToJson(doc.documentElement) };
}

// JSON to XML conversion
function jsonToXml(json, indent = 0) {
    let xml = '';
    const spaces = '  '.repeat(indent);

    for (const key in json) {
        if (key === '@attributes') continue;
        if (key === '#text') {
            xml += json[key];
            continue;
        }

        const value = json[key];

        if (Array.isArray(value)) {
            for (const item of value) {
                xml += `${spaces}<${key}`;
                if (typeof item === 'object' && item['@attributes']) {
                    for (const attr in item['@attributes']) {
                        xml += ` ${attr}="${item['@attributes'][attr]}"`;
                    }
                }
                xml += '>';
                if (typeof item === 'object') {
                    xml += '\n' + jsonToXml(item, indent + 1) + spaces;
                } else {
                    xml += item;
                }
                xml += `</${key}>\n`;
            }
        } else if (typeof value === 'object' && value !== null) {
            xml += `${spaces}<${key}`;
            if (value['@attributes']) {
                for (const attr in value['@attributes']) {
                    xml += ` ${attr}="${value['@attributes'][attr]}"`;
                }
            }
            xml += '>\n' + jsonToXml(value, indent + 1) + `${spaces}</${key}>\n`;
        } else {
            xml += `${spaces}<${key}>${value}</${key}>\n`;
        }
    }

    return xml;
}

// CSV to JSON conversion
function csvToJson(csv) {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) {
        throw new Error('CSV must have a header row and at least one data row.');
    }

    const headers = lines[0].split(',').map(h => h.trim());

    if (headers.some(h => !h)) {
        throw new Error('CSV headers cannot be empty.');
    }

    const result = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());

        if (values.length !== headers.length) {
            ToastManager.warning('Row Mismatch', `Row ${i + 1} has ${values.length} columns, expected ${headers.length}.`);
        }

        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] || '';
        });
        result.push(obj);
    }

    return result;
}

// JSON to CSV conversion
function jsonToCsv(json) {
    if (!Array.isArray(json)) {
        json = [json];
    }

    if (json.length === 0) {
        throw new Error('Cannot convert empty data to CSV.');
    }

    const headers = Object.keys(json[0]);
    let csv = headers.join(',') + '\n';

    for (const row of json) {
        csv += headers.map(h => {
            const val = row[h];
            if (typeof val === 'object') {
                return '"' + JSON.stringify(val).replace(/"/g, '""') + '"';
            }
            const strVal = String(val);
            return strVal.includes(',') || strVal.includes('"') ? `"${strVal.replace(/"/g, '""')}"` : strVal;
        }).join(',') + '\n';
    }

    return csv;
}

// Sample data
document.getElementById('transformSampleBtn').addEventListener('click', () => {
    const format = document.getElementById('inputFormat').value;
    const samples = {
        json: `{
  "networkElements": [
    {
      "neId": "NE-001",
      "name": "Router-West",
      "type": "ROUTER",
      "status": "ACTIVE",
      "ipAddress": "192.168.1.1"
    },
    {
      "neId": "NE-002",
      "name": "Switch-East",
      "type": "SWITCH",
      "status": "ACTIVE",
      "ipAddress": "192.168.1.2"
    }
  ]
}`,
        xml: `<?xml version="1.0" encoding="UTF-8"?>
<networkElements>
  <element neId="NE-001" status="ACTIVE">
    <name>Router-West</name>
    <type>ROUTER</type>
    <ipAddress>192.168.1.1</ipAddress>
  </element>
  <element neId="NE-002" status="ACTIVE">
    <name>Switch-East</name>
    <type>SWITCH</type>
    <ipAddress>192.168.1.2</ipAddress>
  </element>
</networkElements>`,
        csv: `neId,name,type,status,ipAddress
NE-001,Router-West,ROUTER,ACTIVE,192.168.1.1
NE-002,Switch-East,SWITCH,ACTIVE,192.168.1.2`,
        yaml: `networkElements:
  - neId: NE-001
    name: Router-West
    type: ROUTER
    status: ACTIVE
    ipAddress: 192.168.1.1
  - neId: NE-002
    name: Switch-East
    type: SWITCH
    status: ACTIVE
    ipAddress: 192.168.1.2`
    };

    document.getElementById('transformInput').value = samples[format];
    Validator.clearError('transformInput');
    ToastManager.info('Sample Loaded', `${format.toUpperCase()} sample loaded.`);
});

document.getElementById('transformClearBtn').addEventListener('click', () => {
    document.getElementById('transformInput').value = '';
    document.getElementById('transformOutput').innerHTML = '';
    Validator.clearError('transformInput');
});

document.getElementById('transformCopyBtn').addEventListener('click', () => {
    const output = document.getElementById('transformOutput');
    copyToClipboard(output.textContent || output.innerText, 'Transformed output copied!');
});

// ==========================================
// SNMP OID BROWSER
// ==========================================
const commonOids = [
    { oid: '1.3.6.1.2.1.1.1.0', name: 'sysDescr', desc: 'System Description' },
    { oid: '1.3.6.1.2.1.1.2.0', name: 'sysObjectID', desc: 'System Object ID' },
    { oid: '1.3.6.1.2.1.1.3.0', name: 'sysUpTime', desc: 'System Uptime' },
    { oid: '1.3.6.1.2.1.1.4.0', name: 'sysContact', desc: 'System Contact' },
    { oid: '1.3.6.1.2.1.1.5.0', name: 'sysName', desc: 'System Name' },
    { oid: '1.3.6.1.2.1.1.6.0', name: 'sysLocation', desc: 'System Location' },
    { oid: '1.3.6.1.2.1.2.1.0', name: 'ifNumber', desc: 'Number of Interfaces' },
    { oid: '1.3.6.1.2.1.2.2.1.1', name: 'ifIndex', desc: 'Interface Index' },
    { oid: '1.3.6.1.2.1.2.2.1.2', name: 'ifDescr', desc: 'Interface Description' },
    { oid: '1.3.6.1.2.1.2.2.1.3', name: 'ifType', desc: 'Interface Type' },
    { oid: '1.3.6.1.2.1.2.2.1.5', name: 'ifSpeed', desc: 'Interface Speed' },
    { oid: '1.3.6.1.2.1.2.2.1.6', name: 'ifPhysAddress', desc: 'Interface MAC Address' },
    { oid: '1.3.6.1.2.1.2.2.1.7', name: 'ifAdminStatus', desc: 'Interface Admin Status' },
    { oid: '1.3.6.1.2.1.2.2.1.8', name: 'ifOperStatus', desc: 'Interface Oper Status' },
    { oid: '1.3.6.1.2.1.2.2.1.10', name: 'ifInOctets', desc: 'Incoming Bytes' },
    { oid: '1.3.6.1.2.1.2.2.1.16', name: 'ifOutOctets', desc: 'Outgoing Bytes' },
    { oid: '1.3.6.1.4.1', name: 'enterprises', desc: 'Enterprise MIBs' },
    { oid: '1.3.6.1.4.1.9', name: 'cisco', desc: 'Cisco Systems' },
    { oid: '1.3.6.1.4.1.2636', name: 'juniper', desc: 'Juniper Networks' },
    { oid: '1.3.6.1.4.1.2011', name: 'huawei', desc: 'Huawei Technologies' },
    { oid: '1.3.6.1.4.1.6527', name: 'nokia', desc: 'Nokia (Alcatel-Lucent)' },
    { oid: '1.3.6.1.4.1.193', name: 'ericsson', desc: 'Ericsson' },
];

const oidTree = {
    '1': { name: 'iso', desc: 'ISO' },
    '1.3': { name: 'org', desc: 'Organization' },
    '1.3.6': { name: 'dod', desc: 'Department of Defense' },
    '1.3.6.1': { name: 'internet', desc: 'Internet' },
    '1.3.6.1.2': { name: 'mgmt', desc: 'Management' },
    '1.3.6.1.2.1': { name: 'mib-2', desc: 'MIB-2' },
    '1.3.6.1.2.1.1': { name: 'system', desc: 'System MIB' },
    '1.3.6.1.2.1.2': { name: 'interfaces', desc: 'Interfaces MIB' },
    '1.3.6.1.4': { name: 'private', desc: 'Private' },
    '1.3.6.1.4.1': { name: 'enterprises', desc: 'Enterprise MIBs' },
};

function renderMibTree() {
    const container = document.getElementById('mibTree');
    const search = document.getElementById('mibSearch').value.toLowerCase();

    const filtered = commonOids.filter(o =>
        o.oid.includes(search) ||
        o.name.toLowerCase().includes(search) ||
        o.desc.toLowerCase().includes(search)
    );

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state">
            <p>No OIDs match your search.</p>
        </div>`;
        return;
    }

    container.innerHTML = filtered.map(o => `
        <div class="mib-item" onclick="selectOid('${o.oid}')">
            <div class="name">${o.name}</div>
            <div class="oid">${o.oid}</div>
            <div class="desc">${o.desc}</div>
        </div>
    `).join('');
}

window.selectOid = function(oid) {
    document.getElementById('oidInput').value = oid;
    decodeOid(oid);
};

document.getElementById('mibSearch').addEventListener('input', renderMibTree);

document.getElementById('decodeOidBtn').addEventListener('click', () => {
    const oid = document.getElementById('oidInput').value.trim();

    if (Validator.isEmpty(oid)) {
        Validator.setError('oidInput', 'Please enter an OID');
        ToastManager.warning('Empty Input', 'Please enter an OID to decode.');
        return;
    }

    if (!Validator.isValidOid(oid)) {
        Validator.setError('oidInput', 'Invalid OID format. Expected: 1.3.6.1...');
        ToastManager.error('Invalid OID', 'OID must contain only numbers separated by dots.');
        return;
    }

    if (!oid.startsWith('1.')) {
        Validator.setError('oidInput', 'OID should start with 1 (iso)');
        ToastManager.warning('Unusual OID', 'Standard OIDs start with 1 (iso).');
    } else {
        Validator.clearError('oidInput');
    }

    decodeOid(oid);
});

function decodeOid(oid) {
    const result = document.getElementById('oidResult');
    const parts = oid.split('.');
    let decoded = [];
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
        currentPath += (i > 0 ? '.' : '') + parts[i];
        const info = oidTree[currentPath];
        if (info) {
            decoded.push(`<span style="color:var(--primary)">${parts[i]}</span> = ${info.name} (${info.desc})`);
        } else {
            decoded.push(`<span style="color:var(--text-secondary)">${parts[i]}</span>`);
        }
    }

    const match = commonOids.find(o => o.oid === oid);

    let html = `<div style="margin-bottom:12px;"><strong>OID Path:</strong></div>`;
    html += `<div style="font-family:monospace;margin-bottom:16px;">${decoded.join(' → ')}</div>`;

    if (match) {
        html += `<div style="background:var(--bg-input);padding:12px;border-radius:var(--radius);">`;
        html += `<div><strong>Name:</strong> ${match.name}</div>`;
        html += `<div><strong>Description:</strong> ${match.desc}</div>`;
        html += `</div>`;
        ToastManager.success('OID Found', `${match.name} - ${match.desc}`);
    } else {
        html += `<div style="background:var(--bg-input);padding:12px;border-radius:var(--radius);color:var(--text-secondary);">`;
        html += `<p>OID not found in common MIB database.</p>`;
        html += `<p>This may be a vendor-specific or custom OID.</p>`;
        html += `</div>`;
    }

    result.innerHTML = html;
}

// SNMP Walk Formatter
document.getElementById('formatSnmpBtn').addEventListener('click', () => {
    const input = document.getElementById('snmpWalkInput').value.trim();

    if (Validator.isEmpty(input)) {
        Validator.setError('snmpWalkInput', 'Please enter SNMP walk output');
        ToastManager.warning('Empty Input', 'Please paste SNMP walk output.');
        return;
    }

    Validator.clearError('snmpWalkInput');

    const lines = input.split('\n');
    const data = [];
    let skippedLines = 0;

    for (const line of lines) {
        const match = line.match(/^([.\d]+)\s*=\s*(?:(\w+):\s*)?(.*)$/);
        if (match) {
            data.push({
                oid: match[1],
                type: match[2] || 'STRING',
                value: match[3]
            });
        } else if (line.trim()) {
            skippedLines++;
        }
    }

    if (data.length === 0) {
        document.getElementById('snmpFormatOutput').innerHTML = `
            <div class="error-hint">
                <div class="error-hint-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Could Not Parse Output
                </div>
                <div class="error-hint-content">
                    <p>Expected format:</p>
                    <code>1.3.6.1.2.1.1.1.0 = STRING: Description</code><br>
                    <code>1.3.6.1.2.1.1.3.0 = Timeticks: (12345) 0:02:03.45</code>
                </div>
            </div>
        `;
        ToastManager.error('Parse Failed', 'Could not parse SNMP walk output.');
        return;
    }

    if (skippedLines > 0) {
        ToastManager.warning('Partial Parse', `${skippedLines} line(s) could not be parsed.`);
    }

    let html = '<table style="width:100%;border-collapse:collapse;font-size:12px;">';
    html += '<tr style="background:var(--bg-input);"><th style="padding:8px;text-align:left;border:1px solid var(--border);">OID</th>';
    html += '<th style="padding:8px;text-align:left;border:1px solid var(--border);">Type</th>';
    html += '<th style="padding:8px;text-align:left;border:1px solid var(--border);">Value</th></tr>';

    for (const row of data) {
        html += `<tr>
            <td style="padding:8px;border:1px solid var(--border);font-family:monospace;">${escapeHtml(row.oid)}</td>
            <td style="padding:8px;border:1px solid var(--border);">${escapeHtml(row.type)}</td>
            <td style="padding:8px;border:1px solid var(--border);">${escapeHtml(row.value)}</td>
        </tr>`;
    }
    html += '</table>';

    document.getElementById('snmpFormatOutput').innerHTML = html;
    ToastManager.success('Formatted', `Parsed ${data.length} SNMP entries.`);
});

document.getElementById('exportSnmpBtn').addEventListener('click', () => {
    const input = document.getElementById('snmpWalkInput').value.trim();
    if (!input) {
        ToastManager.warning('Nothing to Export', 'Please format SNMP data first.');
        return;
    }

    const lines = input.split('\n');
    let csv = 'OID,Type,Value\n';
    let count = 0;

    for (const line of lines) {
        const match = line.match(/^([.\d]+)\s*=\s*(?:(\w+):\s*)?(.*)$/);
        if (match) {
            csv += `"${match[1]}","${match[2] || 'STRING'}","${match[3].replace(/"/g, '""')}"\n`;
            count++;
        }
    }

    if (count === 0) {
        ToastManager.warning('Nothing to Export', 'No valid SNMP data found.');
        return;
    }

    try {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'snmp-walk.csv';
        a.click();
        URL.revokeObjectURL(url);
        ToastManager.success('Exported', `Exported ${count} SNMP entries.`);
    } catch (err) {
        ToastManager.error('Export Failed', err.message);
    }
});

// Initialize MIB tree
renderMibTree();

// ==========================================
// NETCONF/XML TOOLS
// ==========================================
const netconfTemplates = {
    'get': `<?xml version="1.0" encoding="UTF-8"?>
<rpc xmlns="urn:ietf:params:xml:ns:netconf:base:1.0" message-id="1">
  <get>
    <filter type="subtree">
      <!-- Add your filter here -->
    </filter>
  </get>
</rpc>`,
    'get-config': `<?xml version="1.0" encoding="UTF-8"?>
<rpc xmlns="urn:ietf:params:xml:ns:netconf:base:1.0" message-id="1">
  <get-config>
    <source>
      <running/>
    </source>
    <filter type="subtree">
      <!-- Add your filter here -->
    </filter>
  </get-config>
</rpc>`,
    'edit-config': `<?xml version="1.0" encoding="UTF-8"?>
<rpc xmlns="urn:ietf:params:xml:ns:netconf:base:1.0" message-id="1">
  <edit-config>
    <target>
      <running/>
    </target>
    <config>
      <!-- Add your configuration here -->
    </config>
  </edit-config>
</rpc>`,
    'rpc': `<?xml version="1.0" encoding="UTF-8"?>
<rpc xmlns="urn:ietf:params:xml:ns:netconf:base:1.0" message-id="1">
  <!-- Add your custom RPC operation here -->
</rpc>`,
    'notification': `<?xml version="1.0" encoding="UTF-8"?>
<rpc xmlns="urn:ietf:params:xml:ns:netconf:base:1.0" message-id="1">
  <create-subscription xmlns="urn:ietf:params:xml:ns:netconf:notification:1.0">
    <stream>NETCONF</stream>
  </create-subscription>
</rpc>`
};

document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const template = netconfTemplates[btn.dataset.template];
        document.getElementById('xmlInput').value = template;
        document.getElementById('xmlValidation').textContent = '';
        document.getElementById('xmlValidation').className = 'validation-result';
        ToastManager.info('Template Loaded', `${btn.dataset.template.toUpperCase()} template loaded.`);
    });
});

document.getElementById('formatXmlBtn').addEventListener('click', () => {
    const input = document.getElementById('xmlInput').value;

    if (Validator.isEmpty(input)) {
        ToastManager.warning('Empty Input', 'Please enter XML to format.');
        return;
    }

    try {
        const formatted = formatXml(input);
        document.getElementById('xmlInput').value = formatted;
        showValidation(true, 'XML formatted successfully');
        ToastManager.success('Formatted', 'XML formatted successfully.');
    } catch (err) {
        showValidation(false, 'Invalid XML: ' + err.message);
        ToastManager.error('Format Failed', 'Invalid XML structure.');
    }
});

document.getElementById('minifyXmlBtn').addEventListener('click', () => {
    const input = document.getElementById('xmlInput').value;

    if (Validator.isEmpty(input)) {
        ToastManager.warning('Empty Input', 'Please enter XML to minify.');
        return;
    }

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(input, 'text/xml');
        if (doc.querySelector('parsererror')) {
            throw new Error('Parse error');
        }
        const serializer = new XMLSerializer();
        document.getElementById('xmlInput').value = serializer.serializeToString(doc);
        showValidation(true, 'XML minified');
        ToastManager.success('Minified', 'XML minified successfully.');
    } catch (err) {
        showValidation(false, 'Invalid XML');
        ToastManager.error('Minify Failed', 'Invalid XML structure.');
    }
});

document.getElementById('validateXmlBtn').addEventListener('click', () => {
    const input = document.getElementById('xmlInput').value;

    if (Validator.isEmpty(input)) {
        ToastManager.warning('Empty Input', 'Please enter XML to validate.');
        return;
    }

    const result = Validator.isValidXml(input);
    if (result.valid) {
        showValidation(true, 'Valid XML - No syntax errors found');
        ToastManager.success('Valid', 'XML is well-formed.');
    } else {
        showValidation(false, 'Invalid XML: ' + result.error);
        ToastManager.error('Invalid', 'XML has syntax errors.');
    }
});

function showValidation(valid, message) {
    const el = document.getElementById('xmlValidation');
    el.className = 'validation-result ' + (valid ? 'valid' : 'invalid');
    el.textContent = message;
}

function formatXml(xml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    if (doc.querySelector('parsererror')) {
        throw new Error('Invalid XML');
    }

    const serializer = new XMLSerializer();
    let formatted = serializer.serializeToString(doc);

    formatted = formatted.replace(/></g, '>\n<');
    const lines = formatted.split('\n');
    let indent = 0;
    const result = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('</')) {
            indent--;
        }
        result.push('  '.repeat(Math.max(0, indent)) + trimmed);
        if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.startsWith('<?') && !trimmed.endsWith('/>') && !trimmed.includes('</')) {
            indent++;
        }
    }

    return result.join('\n');
}

// XPath Tester
document.getElementById('testXpathBtn').addEventListener('click', () => {
    const xml = document.getElementById('xmlInput').value;
    const xpath = document.getElementById('xpathInput').value;

    if (Validator.isEmpty(xml)) {
        ToastManager.warning('Missing XML', 'Please enter XML in the editor first.');
        return;
    }

    if (Validator.isEmpty(xpath)) {
        Validator.setError('xpathInput', 'Please enter an XPath expression');
        ToastManager.warning('Missing XPath', 'Please enter an XPath expression.');
        return;
    }

    Validator.clearError('xpathInput');

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'text/xml');

        if (doc.querySelector('parsererror')) {
            throw new Error('Invalid XML in editor');
        }

        const result = doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

        if (result.snapshotLength === 0) {
            document.getElementById('xpathResult').innerHTML = `
                <div style="color:var(--warning);">
                    <p>No matches found for: <code>${escapeHtml(xpath)}</code></p>
                    <p style="margin-top:8px;font-size:12px;color:var(--text-secondary);">
                        Tip: Check namespace prefixes. Default namespaces require special handling.
                    </p>
                </div>
            `;
            ToastManager.info('No Matches', 'XPath returned no results.');
            return;
        }

        let output = `<div style="color:var(--success);margin-bottom:12px;">Found ${result.snapshotLength} match(es):</div>\n`;

        for (let i = 0; i < result.snapshotLength; i++) {
            const node = result.snapshotItem(i);
            if (node.nodeType === Node.ELEMENT_NODE) {
                output += escapeHtml(new XMLSerializer().serializeToString(node)) + '\n\n';
            } else {
                output += escapeHtml(node.textContent) + '\n';
            }
        }

        document.getElementById('xpathResult').innerHTML = `<pre style="margin:0;white-space:pre-wrap;">${output}</pre>`;
        ToastManager.success('XPath Results', `Found ${result.snapshotLength} match(es).`);
    } catch (err) {
        document.getElementById('xpathResult').innerHTML = `
            <div class="error-hint">
                <div class="error-hint-title">XPath Error</div>
                <div class="error-hint-content">${escapeHtml(err.message)}</div>
            </div>
        `;
        ToastManager.error('XPath Error', 'Invalid XPath expression or XML.');
    }
});

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function syntaxHighlightJson(json) {
    if (typeof json !== 'string') {
        json = JSON.stringify(json, null, 2);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let cls = 'json-number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'json-key';
            } else {
                cls = 'json-string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'json-boolean';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

function syntaxHighlightXml(xml) {
    xml = xml.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    xml = xml.replace(/(&lt;\/?[\w-]+)/g, '<span class="xml-tag">$1</span>');
    xml = xml.replace(/(\w+)=/g, '<span class="xml-attr">$1</span>=');
    xml = xml.replace(/"([^"]*)"/g, '<span class="xml-value">"$1"</span>');
    return xml;
}

// ==========================================
// E2E INTEGRATION SOLUTION GENERATOR
// ==========================================

// Initialize Mermaid
if (typeof mermaid !== 'undefined') {
    mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        flowchart: { curve: 'basis' }
    });
}

// E2E State Management
const e2eState = {
    currentPhase: 1,
    project: {
        name: '',
        description: '',
        type: '',
        pattern: '',
        techStack: []
    },
    source: {
        type: '',
        name: '',
        format: '',
        connection: '',
        schema: ''
    },
    destination: {
        type: '',
        name: '',
        format: '',
        connection: '',
        schema: ''
    },
    mappings: [],
    rules: [],
    technical: {
        errorHandling: 'retry',
        logging: 'info',
        scheduling: 'realtime',
        performance: 1000,
        security: []
    },
    artifacts: {}
};

// Phase Navigation
document.querySelectorAll('.phase-step').forEach(step => {
    step.addEventListener('click', () => {
        const phase = parseInt(step.dataset.phase);
        if (phase <= e2eState.currentPhase || step.classList.contains('completed')) {
            goToPhase(phase);
        }
    });
});

function goToPhase(phase) {
    // Update phase steps
    document.querySelectorAll('.phase-step').forEach(s => {
        s.classList.remove('active');
        if (parseInt(s.dataset.phase) < phase) {
            s.classList.add('completed');
        }
    });
    document.querySelector(`.phase-step[data-phase="${phase}"]`).classList.add('active');

    // Update phase panels
    document.querySelectorAll('.phase-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`phase${phase}`).classList.add('active');

    e2eState.currentPhase = phase;
}

// Requirements Section Accordion
document.querySelectorAll('.req-section-header').forEach(header => {
    header.addEventListener('click', () => {
        const section = header.closest('.req-section');
        section.classList.toggle('active');
    });
});

// Add Field Mapping
document.getElementById('e2eAddMappingBtn')?.addEventListener('click', () => {
    const container = document.getElementById('e2eMappingRows');
    const row = document.createElement('div');
    row.className = 'mapping-row';
    row.innerHTML = `
        <input type="text" placeholder="source_field">
        <input type="text" placeholder="dest_field">
        <select>
            <option value="direct">Direct Copy</option>
            <option value="concat">Concatenate</option>
            <option value="split">Split</option>
            <option value="lookup">Lookup</option>
            <option value="format">Format/Convert</option>
            <option value="custom">Custom Logic</option>
        </select>
        <button class="btn-icon btn-remove-mapping" title="Remove">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
        </button>
    `;
    container.appendChild(row);
    attachRemoveMappingHandler(row.querySelector('.btn-remove-mapping'));
});

// Remove Mapping Handler
function attachRemoveMappingHandler(btn) {
    btn?.addEventListener('click', () => {
        btn.closest('.mapping-row').remove();
    });
}

document.querySelectorAll('.btn-remove-mapping').forEach(attachRemoveMappingHandler);

// Add Business Rule
document.getElementById('e2eAddRuleBtn')?.addEventListener('click', () => {
    const container = document.getElementById('e2eRulesRows');
    const row = document.createElement('div');
    row.className = 'rule-row';
    row.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <label>Rule Name</label>
                <input type="text" placeholder="e.g., Filter Invalid Records">
            </div>
            <div class="form-group">
                <label>Action</label>
                <select>
                    <option value="filter">Filter/Exclude</option>
                    <option value="transform">Transform</option>
                    <option value="route">Route/Split</option>
                    <option value="aggregate">Aggregate</option>
                    <option value="enrich">Enrich</option>
                    <option value="validate">Validate</option>
                </select>
            </div>
        </div>
        <div class="form-group">
            <label>Condition / Logic</label>
            <textarea placeholder="e.g., WHERE status = 'ACTIVE' AND amount > 0"></textarea>
        </div>
    `;
    container.appendChild(row);
});

// Collect Requirements Data
function collectRequirements() {
    // Project Details
    e2eState.project.name = document.getElementById('e2eProjectName')?.value || 'Integration-Project';
    e2eState.project.description = document.getElementById('e2eProjectDesc')?.value || '';
    e2eState.project.type = document.getElementById('e2eIntegrationType')?.value || 'etl';
    e2eState.project.pattern = document.getElementById('e2ePattern')?.value || 'point-to-point';

    e2eState.project.techStack = [];
    if (document.getElementById('e2eTechJava')?.checked) e2eState.project.techStack.push('java');
    if (document.getElementById('e2eTechPython')?.checked) e2eState.project.techStack.push('python');
    if (document.getElementById('e2eTechNode')?.checked) e2eState.project.techStack.push('nodejs');
    if (e2eState.project.techStack.length === 0) e2eState.project.techStack.push('java');

    // Source System
    e2eState.source.type = document.getElementById('e2eSourceType')?.value || 'database';
    e2eState.source.name = document.getElementById('e2eSourceName')?.value || 'Source System';
    e2eState.source.format = document.getElementById('e2eSourceFormat')?.value || 'json';
    e2eState.source.connection = document.getElementById('e2eSourceConn')?.value || '';
    e2eState.source.schema = document.getElementById('e2eSourceSchema')?.value || '';

    // Destination System
    e2eState.destination.type = document.getElementById('e2eDestType')?.value || 'api';
    e2eState.destination.name = document.getElementById('e2eDestName')?.value || 'Destination System';
    e2eState.destination.format = document.getElementById('e2eDestFormat')?.value || 'json';
    e2eState.destination.connection = document.getElementById('e2eDestConn')?.value || '';
    e2eState.destination.schema = document.getElementById('e2eDestSchema')?.value || '';

    // Mappings
    e2eState.mappings = [];
    document.querySelectorAll('#e2eMappingRows .mapping-row').forEach(row => {
        const inputs = row.querySelectorAll('input');
        const select = row.querySelector('select');
        if (inputs[0]?.value && inputs[1]?.value) {
            e2eState.mappings.push({
                source: inputs[0].value,
                destination: inputs[1].value,
                transformation: select?.value || 'direct'
            });
        }
    });

    // Business Rules
    e2eState.rules = [];
    document.querySelectorAll('#e2eRulesRows .rule-row').forEach(row => {
        const name = row.querySelector('input')?.value;
        const action = row.querySelector('select')?.value;
        const condition = row.querySelector('textarea')?.value;
        if (name && condition) {
            e2eState.rules.push({ name, action, condition });
        }
    });

    // Technical Requirements
    e2eState.technical.errorHandling = document.getElementById('e2eErrorHandling')?.value || 'retry';
    e2eState.technical.logging = document.getElementById('e2eLogging')?.value || 'info';
    e2eState.technical.scheduling = document.getElementById('e2eScheduling')?.value || 'realtime';
    e2eState.technical.performance = parseInt(document.getElementById('e2ePerformance')?.value) || 1000;

    e2eState.technical.security = [];
    if (document.getElementById('e2eSecEncrypt')?.checked) e2eState.technical.security.push('encryption');
    if (document.getElementById('e2eSecAuth')?.checked) e2eState.technical.security.push('auth');
    if (document.getElementById('e2eSecMask')?.checked) e2eState.technical.security.push('masking');
    if (document.getElementById('e2eSecAudit')?.checked) e2eState.technical.security.push('audit');
}

// Validate Requirements
function validateRequirements() {
    const errors = [];

    if (!document.getElementById('e2eProjectName')?.value) {
        errors.push('Project Name is required');
    }
    if (!document.getElementById('e2eIntegrationType')?.value) {
        errors.push('Integration Type is required');
    }
    if (!document.getElementById('e2ePattern')?.value) {
        errors.push('Integration Pattern is required');
    }
    if (!document.getElementById('e2eSourceType')?.value) {
        errors.push('Source System Type is required');
    }
    if (!document.getElementById('e2eDestType')?.value) {
        errors.push('Destination System Type is required');
    }

    return errors;
}

// Phase 1 -> Phase 2 (Generate Design)
document.getElementById('e2eNextPhase1Btn')?.addEventListener('click', () => {
    const errors = validateRequirements();
    if (errors.length > 0) {
        ToastManager.error('Validation Error', errors.join('. '));
        return;
    }

    collectRequirements();
    generateDesign();
    goToPhase(2);
    ToastManager.success('Design Generated', 'Solution architecture created based on your requirements.');
});

// Generate Design (Phase 2)
function generateDesign() {
    generateFlowDiagram();
    generateArchDiagram();
    generateComponentBreakdown();
    generateDataflowSpec();
}

function generateFlowDiagram() {
    const { source, destination, project, mappings, rules } = e2eState;

    let mermaidCode = `flowchart LR
    subgraph Source["${source.name}"]
        S1[("${getSystemIcon(source.type)}\\n${source.type.toUpperCase()}")]
    end

    subgraph Integration["Integration Layer"]
        E[Extract]
        T[Transform]
        V[Validate]
        L[Load]
    end

    subgraph Destination["${destination.name}"]
        D1[("${getSystemIcon(destination.type)}\\n${destination.type.toUpperCase()}")]
    end

    S1 --> E
    E --> T
    T --> V
    V --> L
    L --> D1`;

    if (e2eState.technical.errorHandling === 'deadletter') {
        mermaidCode += `\n    V -->|Error| DLQ[Dead Letter Queue]`;
    } else if (e2eState.technical.errorHandling === 'retry') {
        mermaidCode += `\n    V -->|Retry| E`;
    }

    document.getElementById('flowMermaidCode').value = mermaidCode;
    renderMermaid('flowDiagram', mermaidCode);
}

function generateArchDiagram() {
    const { source, destination, project, technical } = e2eState;
    const techStack = project.techStack[0] || 'java';

    let mermaidCode = `graph TB
    subgraph Source["Source Systems"]
        S1["${source.name}<br/>${source.type}"]
    end

    subgraph Integration["Integration Platform"]
        C1["Connector<br/>${techStack === 'java' ? 'Spring Integration' : techStack === 'python' ? 'Apache Airflow' : 'Node.js'}"]
        T1["Transformer<br/>Data Mapping"]
        V1["Validator<br/>Business Rules"]`;

    if (technical.security.includes('encryption')) {
        mermaidCode += `\n        SEC["Security<br/>Encryption"]`;
    }

    mermaidCode += `
    end

    subgraph Destination["Destination Systems"]
        D1["${destination.name}<br/>${destination.type}"]
    end

    subgraph Monitoring["Observability"]
        M1["Metrics<br/>Prometheus"]
        M2["Logs<br/>ELK Stack"]
    end

    S1 --> C1
    C1 --> T1
    T1 --> V1`;

    if (technical.security.includes('encryption')) {
        mermaidCode += `\n    V1 --> SEC\n    SEC --> D1`;
    } else {
        mermaidCode += `\n    V1 --> D1`;
    }

    mermaidCode += `\n    C1 -.-> M1\n    C1 -.-> M2`;

    document.getElementById('archMermaidCode').value = mermaidCode;
    renderMermaid('archDiagram', mermaidCode);
}

function getSystemIcon(type) {
    const icons = {
        database: 'DB',
        api: 'API',
        file: 'FILE',
        mq: 'MQ',
        ftp: 'FTP',
        ems: 'EMS',
        oss: 'OSS'
    };
    return icons[type] || 'SYS';
}

async function renderMermaid(containerId, code) {
    const container = document.getElementById(containerId);
    if (!container || typeof mermaid === 'undefined') return;

    try {
        container.innerHTML = '';
        const { svg } = await mermaid.render(`mermaid-${containerId}-${Date.now()}`, code);
        container.innerHTML = svg;
    } catch (err) {
        container.innerHTML = `<div style="color:var(--danger);padding:20px;">Error rendering diagram: ${err.message}</div>`;
    }
}

function generateComponentBreakdown() {
    const { project, source, destination, technical } = e2eState;
    const techStack = project.techStack[0] || 'java';

    const components = [
        { name: 'Source Connector', purpose: `Connect to ${source.name}`, tech: getConnectorTech(source.type, techStack), deps: 'Config, Logging' },
        { name: 'Data Extractor', purpose: `Extract ${source.format} data`, tech: getExtractorTech(source.format, techStack), deps: 'Source Connector' },
        { name: 'Data Transformer', purpose: 'Apply field mappings', tech: getTransformTech(techStack), deps: 'Schema Definitions' },
        { name: 'Business Rules Engine', purpose: 'Apply business rules', tech: getRulesTech(techStack), deps: 'Configuration' },
        { name: 'Data Validator', purpose: 'Validate transformed data', tech: 'JSON Schema / XSD', deps: 'Schema Definitions' },
        { name: 'Destination Connector', purpose: `Connect to ${destination.name}`, tech: getConnectorTech(destination.type, techStack), deps: 'Config, Auth' },
        { name: 'Data Loader', purpose: `Load ${destination.format} data`, tech: getLoaderTech(destination.type, techStack), deps: 'Destination Connector' },
        { name: 'Error Handler', purpose: technical.errorHandling, tech: 'Custom Implementation', deps: 'Logging, Alerting' },
        { name: 'Monitoring', purpose: 'Metrics & Logging', tech: 'Prometheus, Grafana', deps: 'All Components' }
    ];

    let html = `<table style="width:100%;border-collapse:collapse;">
        <thead>
            <tr style="background:var(--bg-input);">
                <th style="padding:10px;text-align:left;border:1px solid var(--border);">Component</th>
                <th style="padding:10px;text-align:left;border:1px solid var(--border);">Purpose</th>
                <th style="padding:10px;text-align:left;border:1px solid var(--border);">Technology</th>
                <th style="padding:10px;text-align:left;border:1px solid var(--border);">Dependencies</th>
            </tr>
        </thead>
        <tbody>`;

    components.forEach(c => {
        html += `<tr>
            <td style="padding:10px;border:1px solid var(--border);font-weight:500;">${c.name}</td>
            <td style="padding:10px;border:1px solid var(--border);color:var(--text-secondary);">${c.purpose}</td>
            <td style="padding:10px;border:1px solid var(--border);"><code>${c.tech}</code></td>
            <td style="padding:10px;border:1px solid var(--border);color:var(--text-secondary);font-size:12px;">${c.deps}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    document.getElementById('componentTable').innerHTML = html;
}

function getConnectorTech(type, stack) {
    const connectors = {
        java: { database: 'JDBC / JPA', api: 'RestTemplate / WebClient', file: 'Apache Commons IO', mq: 'Spring Kafka', ftp: 'Apache Commons Net' },
        python: { database: 'SQLAlchemy', api: 'Requests', file: 'Pandas', mq: 'kafka-python', ftp: 'paramiko' },
        nodejs: { database: 'Sequelize', api: 'Axios', file: 'fs / csv-parser', mq: 'kafkajs', ftp: 'ssh2-sftp-client' }
    };
    return connectors[stack]?.[type] || 'Custom Connector';
}

function getExtractorTech(format, stack) {
    const extractors = {
        java: { json: 'Jackson', xml: 'JAXB', csv: 'OpenCSV', avro: 'Apache Avro' },
        python: { json: 'json', xml: 'lxml', csv: 'pandas', avro: 'fastavro' },
        nodejs: { json: 'Native JSON', xml: 'xml2js', csv: 'csv-parser', avro: 'avsc' }
    };
    return extractors[stack]?.[format] || 'Custom Parser';
}

function getTransformTech(stack) {
    const transforms = { java: 'MapStruct / ModelMapper', python: 'Pandas / Custom', nodejs: 'Lodash / Custom' };
    return transforms[stack] || 'Custom Transformer';
}

function getRulesTech(stack) {
    const rules = { java: 'Drools / SpEL', python: 'Rule Engine / Custom', nodejs: 'json-rules-engine' };
    return rules[stack] || 'Custom Rules';
}

function getLoaderTech(type, stack) {
    const loaders = {
        java: { database: 'Batch Insert / JPA', api: 'RestTemplate', mq: 'KafkaTemplate' },
        python: { database: 'Bulk Insert', api: 'Requests', mq: 'Producer' },
        nodejs: { database: 'Bulk Operations', api: 'Axios', mq: 'Producer' }
    };
    return loaders[stack]?.[type] || 'Custom Loader';
}

function generateDataflowSpec() {
    const { source, destination, mappings, rules, technical } = e2eState;

    let html = `<div class="markdown-content">
        <h5>1. Data Extraction</h5>
        <ul>
            <li><strong>Source:</strong> ${source.name} (${source.type})</li>
            <li><strong>Format:</strong> ${source.format.toUpperCase()}</li>
            <li><strong>Frequency:</strong> ${technical.scheduling}</li>
        </ul>

        <h5>2. Data Transformation</h5>
        <ul>`;

    if (mappings.length > 0) {
        mappings.forEach(m => {
            html += `<li><code>${m.source}</code> → <code>${m.destination}</code> (${m.transformation})</li>`;
        });
    } else {
        html += `<li>Direct mapping (schema-to-schema)</li>`;
    }

    html += `</ul>

        <h5>3. Business Rules</h5>
        <ul>`;

    if (rules.length > 0) {
        rules.forEach(r => {
            html += `<li><strong>${r.name}:</strong> ${r.action} - ${r.condition}</li>`;
        });
    } else {
        html += `<li>No custom business rules defined</li>`;
    }

    html += `</ul>

        <h5>4. Data Loading</h5>
        <ul>
            <li><strong>Destination:</strong> ${destination.name} (${destination.type})</li>
            <li><strong>Format:</strong> ${destination.format.toUpperCase()}</li>
            <li><strong>Error Handling:</strong> ${technical.errorHandling}</li>
        </ul>

        <h5>5. Error Handling</h5>
        <ul>
            <li><strong>Strategy:</strong> ${technical.errorHandling}</li>
            <li><strong>Logging Level:</strong> ${technical.logging}</li>
            <li><strong>Retry Policy:</strong> ${technical.errorHandling === 'retry' ? '3 retries with exponential backoff' : 'N/A'}</li>
        </ul>
    </div>`;

    document.getElementById('dataflowSpec').innerHTML = html;
}

// Design Tabs
document.querySelectorAll('.design-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.design-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.design-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`${tab.dataset.design}Design`).classList.add('active');
    });
});

// Re-render buttons
document.getElementById('rerenderFlowBtn')?.addEventListener('click', () => {
    const code = document.getElementById('flowMermaidCode').value;
    renderMermaid('flowDiagram', code);
});

document.getElementById('rerenderArchBtn')?.addEventListener('click', () => {
    const code = document.getElementById('archMermaidCode').value;
    renderMermaid('archDiagram', code);
});

// Copy Mermaid Code
document.getElementById('copyFlowMermaid')?.addEventListener('click', () => {
    copyToClipboard(document.getElementById('flowMermaidCode').value, 'Flow diagram code copied!');
});

document.getElementById('copyArchMermaid')?.addEventListener('click', () => {
    copyToClipboard(document.getElementById('archMermaidCode').value, 'Architecture diagram code copied!');
});

// Phase 2 -> Phase 3 (Generate Artifacts)
document.getElementById('e2eNextPhase2Btn')?.addEventListener('click', () => {
    generateArtifacts();
    goToPhase(3);
    ToastManager.success('Artifacts Generated', 'Development artifacts created successfully.');
});

// Back buttons
document.getElementById('e2eBackPhase1Btn')?.addEventListener('click', () => goToPhase(1));
document.getElementById('e2eBackPhase2Btn')?.addEventListener('click', () => goToPhase(2));
document.getElementById('e2eBackPhase3Btn')?.addEventListener('click', () => goToPhase(3));

// Generate Artifacts (Phase 3)
function generateArtifacts() {
    const techStack = e2eState.project.techStack[0] || 'java';

    e2eState.artifacts = {
        code: generateCodeArtifacts(techStack),
        orchestration: generateOrchestrationArtifacts(),
        database: generateDatabaseArtifacts(),
        infrastructure: generateInfraArtifacts(),
        monitoring: generateMonitoringArtifacts()
    };

    // Update UI
    updateArtifactList('codeArtifactList', Object.keys(e2eState.artifacts.code));
    updateArtifactList('orchArtifactList', Object.keys(e2eState.artifacts.orchestration));
    updateArtifactList('dbArtifactList', Object.keys(e2eState.artifacts.database));
    updateArtifactList('iacArtifactList', Object.keys(e2eState.artifacts.infrastructure));
    updateArtifactList('monArtifactList', Object.keys(e2eState.artifacts.monitoring));
}

function updateArtifactList(containerId, files) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = files.map(f => `<span>${f}</span>`).join('');
}

function generateCodeArtifacts(stack) {
    const { project, source, destination, mappings } = e2eState;
    const projectName = project.name.replace(/[^a-zA-Z0-9]/g, '');

    if (stack === 'java') {
        return generateJavaCode(projectName);
    } else if (stack === 'python') {
        return generatePythonCode(projectName);
    } else {
        return generateNodeCode(projectName);
    }
}

function generateJavaCode(projectName) {
    const { source, destination, mappings, technical } = e2eState;

    return {
        'Application.java': `package com.integration.${projectName.toLowerCase()};

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}`,

        'IntegrationConfig.java': `package com.integration.${projectName.toLowerCase()}.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;

@Configuration
public class IntegrationConfig {

    @Bean
    public SourceConnector sourceConnector() {
        return new SourceConnector("${source.connection}");
    }

    @Bean
    public DestinationConnector destinationConnector() {
        return new DestinationConnector("${destination.connection}");
    }
}`,

        'SourceConnector.java': `package com.integration.${projectName.toLowerCase()}.connector;

import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class SourceConnector {
    private static final Logger logger = LoggerFactory.getLogger(SourceConnector.class);
    private final String connectionString;

    public SourceConnector(String connectionString) {
        this.connectionString = connectionString;
    }

    public Object extract() {
        logger.info("Extracting data from source: ${source.name}");
        // TODO: Implement extraction logic for ${source.type}
        return null;
    }
}`,

        'DataTransformer.java': `package com.integration.${projectName.toLowerCase()}.transformer;

import org.springframework.stereotype.Component;
import java.util.Map;
import java.util.HashMap;

@Component
public class DataTransformer {

    public Map<String, Object> transform(Map<String, Object> sourceData) {
        Map<String, Object> result = new HashMap<>();

        // Field Mappings
${mappings.map(m => `        result.put("${m.destination}", sourceData.get("${m.source}")); // ${m.transformation}`).join('\n')}

        return result;
    }
}`,

        'IntegrationService.java': `package com.integration.${projectName.toLowerCase()}.service;

import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class IntegrationService {
    private static final Logger logger = LoggerFactory.getLogger(IntegrationService.class);

    private final SourceConnector sourceConnector;
    private final DataTransformer transformer;
    private final DestinationConnector destinationConnector;

    public IntegrationService(SourceConnector src, DataTransformer trans, DestinationConnector dest) {
        this.sourceConnector = src;
        this.transformer = trans;
        this.destinationConnector = dest;
    }

    ${technical.scheduling !== 'realtime' ? '@Scheduled(cron = "0 0 * * * *")' : ''}
    public void runIntegration() {
        logger.info("Starting integration job");
        try {
            Object data = sourceConnector.extract();
            Object transformed = transformer.transform((Map) data);
            destinationConnector.load(transformed);
            logger.info("Integration completed successfully");
        } catch (Exception e) {
            logger.error("Integration failed", e);
            ${technical.errorHandling === 'retry' ? '// TODO: Implement retry logic' : ''}
        }
    }
}`,

        'pom.xml': `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
    </parent>

    <groupId>com.integration</groupId>
    <artifactId>${projectName.toLowerCase()}</artifactId>
    <version>1.0.0</version>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>io.micrometer</groupId>
            <artifactId>micrometer-registry-prometheus</artifactId>
        </dependency>
    </dependencies>
</project>`
    };
}

function generatePythonCode(projectName) {
    const { source, destination, mappings, technical } = e2eState;

    return {
        'main.py': `#!/usr/bin/env python3
"""${e2eState.project.description || projectName} - Integration Service"""

import logging
from integration import IntegrationService

logging.basicConfig(level=logging.${technical.logging.toUpperCase()})
logger = logging.getLogger(__name__)

def main():
    logger.info("Starting ${projectName} integration")
    service = IntegrationService()
    service.run()

if __name__ == "__main__":
    main()`,

        'integration.py': `"""Core Integration Service"""

import logging
from source_connector import SourceConnector
from transformer import DataTransformer
from destination_connector import DestinationConnector

logger = logging.getLogger(__name__)

class IntegrationService:
    def __init__(self):
        self.source = SourceConnector()
        self.transformer = DataTransformer()
        self.destination = DestinationConnector()

    def run(self):
        try:
            logger.info("Extracting data from ${source.name}")
            data = self.source.extract()

            logger.info("Transforming data")
            transformed = self.transformer.transform(data)

            logger.info("Loading data to ${destination.name}")
            self.destination.load(transformed)

            logger.info("Integration completed successfully")
        except Exception as e:
            logger.error(f"Integration failed: {e}")
            ${technical.errorHandling === 'retry' ? 'self._retry()' : 'raise'}`,

        'transformer.py': `"""Data Transformation Module"""

class DataTransformer:
    def transform(self, data):
        result = {}

        # Field Mappings
${mappings.map(m => `        result["${m.destination}"] = data.get("${m.source}")  # ${m.transformation}`).join('\n')}

        return result`,

        'requirements.txt': `# ${projectName} Dependencies
requests>=2.28.0
pandas>=2.0.0
pyyaml>=6.0
prometheus-client>=0.17.0
python-json-logger>=2.0.0`
    };
}

function generateNodeCode(projectName) {
    const { source, destination, mappings, technical } = e2eState;

    return {
        'index.js': `/**
 * ${projectName} - Integration Service
 */

const IntegrationService = require('./integration');
const logger = require('./logger');

async function main() {
    logger.info('Starting ${projectName} integration');
    const service = new IntegrationService();
    await service.run();
}

main().catch(err => {
    logger.error('Integration failed:', err);
    process.exit(1);
});`,

        'integration.js': `const SourceConnector = require('./connectors/source');
const DestinationConnector = require('./connectors/destination');
const Transformer = require('./transformer');
const logger = require('./logger');

class IntegrationService {
    constructor() {
        this.source = new SourceConnector();
        this.destination = new DestinationConnector();
        this.transformer = new Transformer();
    }

    async run() {
        try {
            logger.info('Extracting data from ${source.name}');
            const data = await this.source.extract();

            logger.info('Transforming data');
            const transformed = this.transformer.transform(data);

            logger.info('Loading data to ${destination.name}');
            await this.destination.load(transformed);

            logger.info('Integration completed successfully');
        } catch (error) {
            logger.error('Integration failed:', error);
            ${technical.errorHandling === 'retry' ? 'await this.retry();' : 'throw error;'}
        }
    }
}

module.exports = IntegrationService;`,

        'transformer.js': `class Transformer {
    transform(data) {
        const result = {};

        // Field Mappings
${mappings.map(m => `        result['${m.destination}'] = data['${m.source}']; // ${m.transformation}`).join('\n')}

        return result;
    }
}

module.exports = Transformer;`,

        'package.json': `{
    "name": "${projectName.toLowerCase()}",
    "version": "1.0.0",
    "description": "${e2eState.project.description || 'Integration Service'}",
    "main": "index.js",
    "scripts": {
        "start": "node index.js",
        "test": "jest"
    },
    "dependencies": {
        "axios": "^1.6.0",
        "winston": "^3.11.0",
        "prom-client": "^15.0.0"
    }
}`
    };
}

function generateOrchestrationArtifacts() {
    const { project, technical } = e2eState;
    const projectName = project.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    return {
        'airflow_dag.py': `from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'integration-team',
    'depends_on_past': False,
    'retries': ${technical.errorHandling === 'retry' ? 3 : 0},
    'retry_delay': timedelta(minutes=5),
}

dag = DAG(
    '${projectName}_integration',
    default_args=default_args,
    description='${project.description || 'Integration workflow'}',
    schedule_interval='${getCronExpression(technical.scheduling)}',
    start_date=datetime(2024, 1, 1),
    catchup=False,
)

def run_integration():
    from integration import IntegrationService
    service = IntegrationService()
    service.run()

integration_task = PythonOperator(
    task_id='run_integration',
    python_callable=run_integration,
    dag=dag,
)`,

        'cronjob.yaml': `apiVersion: batch/v1
kind: CronJob
metadata:
  name: ${projectName}-integration
spec:
  schedule: "${getCronExpression(technical.scheduling)}"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: integration
            image: ${projectName}:latest
            envFrom:
            - configMapRef:
                name: ${projectName}-config
          restartPolicy: OnFailure`
    };
}

function getCronExpression(scheduling) {
    const crons = {
        realtime: '* * * * *',
        hourly: '0 * * * *',
        daily: '0 0 * * *',
        weekly: '0 0 * * 0'
    };
    return crons[scheduling] || '0 * * * *';
}

function generateDatabaseArtifacts() {
    const { project, source, destination } = e2eState;
    const projectName = project.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    return {
        'schema.sql': `-- ${project.name} Database Schema

-- Staging Table
CREATE TABLE IF NOT EXISTS ${projectName}_staging (
    id SERIAL PRIMARY KEY,
    source_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending'
);

-- Error Log Table
CREATE TABLE IF NOT EXISTS ${projectName}_error_log (
    id SERIAL PRIMARY KEY,
    record_id INTEGER REFERENCES ${projectName}_staging(id),
    error_message TEXT,
    error_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Trail Table
CREATE TABLE IF NOT EXISTS ${projectName}_audit (
    id SERIAL PRIMARY KEY,
    action VARCHAR(50) NOT NULL,
    record_count INTEGER,
    duration_ms INTEGER,
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_${projectName}_staging_status ON ${projectName}_staging(status);
CREATE INDEX idx_${projectName}_staging_created ON ${projectName}_staging(created_at);`,

        'migrations.sql': `-- Migration: Initial Setup
-- Version: 1.0.0

BEGIN;

-- Run schema creation
\\i schema.sql

-- Insert initial config
INSERT INTO ${projectName}_audit (action, status)
VALUES ('schema_created', 'success');

COMMIT;`
    };
}

function generateInfraArtifacts() {
    const { project } = e2eState;
    const projectName = project.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    return {
        'Dockerfile': `FROM eclipse-temurin:17-jre-alpine

WORKDIR /app
COPY target/*.jar app.jar

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s \\
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]`,

        'docker-compose.yml': `version: '3.8'

services:
  ${projectName}:
    build: .
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=production
    depends_on:
      - postgres
    networks:
      - integration-net

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${projectName}
      POSTGRES_USER: integration
      POSTGRES_PASSWORD: \${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - integration-net

volumes:
  postgres_data:

networks:
  integration-net:`,

        'terraform/main.tf': `terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

resource "aws_ecs_cluster" "${projectName}" {
  name = "${projectName}-cluster"
}

resource "aws_ecs_task_definition" "${projectName}" {
  family                   = "${projectName}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512

  container_definitions = jsonencode([
    {
      name  = "${projectName}"
      image = "\${var.ecr_repo}:latest"
      portMappings = [
        {
          containerPort = 8080
          hostPort      = 8080
        }
      ]
    }
  ])
}`
    };
}

function generateMonitoringArtifacts() {
    const { project } = e2eState;
    const projectName = project.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    return {
        'prometheus.yml': `global:
  scrape_interval: 15s

scrape_configs:
  - job_name: '${projectName}'
    static_configs:
      - targets: ['localhost:8080']
    metrics_path: /actuator/prometheus`,

        'grafana-dashboard.json': `{
  "dashboard": {
    "title": "${project.name} Dashboard",
    "panels": [
      {
        "title": "Integration Success Rate",
        "type": "gauge",
        "targets": [
          {
            "expr": "rate(integration_success_total[5m]) / rate(integration_total[5m]) * 100"
          }
        ]
      },
      {
        "title": "Processing Time (p95)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(integration_duration_seconds_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(integration_errors_total[5m])"
          }
        ]
      }
    ]
  }
}`,

        'alerts.yml': `groups:
  - name: ${projectName}_alerts
    rules:
      - alert: IntegrationFailure
        expr: rate(integration_errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Integration errors detected"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(integration_duration_seconds_bucket[5m])) > 30
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High integration latency"`
    };
}

// Artifact Viewer
let currentArtifactCategory = null;
let currentArtifactFile = null;

document.getElementById('viewCodeArtifact')?.addEventListener('click', () => showArtifactViewer('code', 'Integration Code'));
document.getElementById('viewOrchArtifact')?.addEventListener('click', () => showArtifactViewer('orchestration', 'Job Orchestration'));
document.getElementById('viewDbArtifact')?.addEventListener('click', () => showArtifactViewer('database', 'Database Schema'));
document.getElementById('viewIacArtifact')?.addEventListener('click', () => showArtifactViewer('infrastructure', 'Infrastructure'));
document.getElementById('viewMonArtifact')?.addEventListener('click', () => showArtifactViewer('monitoring', 'Monitoring'));

function showArtifactViewer(category, title) {
    const viewer = document.getElementById('artifactViewer');
    const artifacts = e2eState.artifacts[category];
    if (!artifacts || Object.keys(artifacts).length === 0) {
        ToastManager.warning('No Artifacts', 'Artifacts not generated yet.');
        return;
    }

    currentArtifactCategory = category;
    document.getElementById('artifactViewerTitle').textContent = title;

    // Create file tabs
    const tabsContainer = document.getElementById('artifactFileTabs');
    tabsContainer.innerHTML = '';
    const files = Object.keys(artifacts);
    files.forEach((file, index) => {
        const btn = document.createElement('button');
        btn.textContent = file;
        btn.className = index === 0 ? 'active' : '';
        btn.addEventListener('click', () => showArtifactFile(file));
        tabsContainer.appendChild(btn);
    });

    // Show first file
    showArtifactFile(files[0]);
    viewer.classList.remove('hidden');
}

function showArtifactFile(filename) {
    currentArtifactFile = filename;
    const content = e2eState.artifacts[currentArtifactCategory][filename];
    document.getElementById('artifactCodeContent').innerHTML = `<pre>${escapeHtml(content)}</pre>`;

    document.querySelectorAll('#artifactFileTabs button').forEach(btn => {
        btn.classList.toggle('active', btn.textContent === filename);
    });
}

document.getElementById('closeArtifactViewer')?.addEventListener('click', () => {
    document.getElementById('artifactViewer').classList.add('hidden');
});

document.getElementById('copyArtifactCode')?.addEventListener('click', () => {
    const content = e2eState.artifacts[currentArtifactCategory][currentArtifactFile];
    copyToClipboard(content, `${currentArtifactFile} copied!`);
});

// Phase 3 -> Phase 4 (Generate Deployment)
document.getElementById('e2eNextPhase3Btn')?.addEventListener('click', () => {
    generateDeploymentPhase();
    goToPhase(4);
    ToastManager.success('Deployment Ready', 'Execution scripts and guides generated.');
});

function generateDeploymentPhase() {
    generateExecutionScripts();
    generateTestingScripts();
    generateDeploymentGuide();
}

function generateExecutionScripts() {
    const container = document.getElementById('execScriptList');
    const scripts = ['run.sh', 'setup.sh', 'cleanup.sh'];
    container.innerHTML = scripts.map(s => `
        <div class="script-item">
            <span>${s}</span>
            <button class="btn btn-outline btn-sm" onclick="copyScript('${s}')">Copy</button>
        </div>
    `).join('');
}

function generateTestingScripts() {
    const container = document.getElementById('testScriptList');
    const techStack = e2eState.project.techStack[0] || 'java';
    const tests = techStack === 'java'
        ? ['IntegrationTest.java', 'TransformerTest.java']
        : techStack === 'python'
        ? ['test_integration.py', 'test_transformer.py']
        : ['integration.test.js', 'transformer.test.js'];

    container.innerHTML = tests.map(t => `
        <div class="script-item">
            <span>${t}</span>
            <button class="btn btn-outline btn-sm" onclick="copyScript('${t}')">Copy</button>
        </div>
    `).join('');
}

function generateDeploymentGuide() {
    const { project, source, destination, technical } = e2eState;
    const techStack = project.techStack[0] || 'java';

    const guide = `
        <h5>Prerequisites</h5>
        <ul>
            <li>${techStack === 'java' ? 'Java 17+ and Maven' : techStack === 'python' ? 'Python 3.9+' : 'Node.js 18+'}</li>
            <li>Docker and Docker Compose</li>
            <li>Access to ${source.name} (${source.type})</li>
            <li>Access to ${destination.name} (${destination.type})</li>
        </ul>

        <h5>Setup Steps</h5>
        <ul>
            <li>Clone the repository</li>
            <li>Copy <code>.env.example</code> to <code>.env</code> and configure</li>
            <li>Run <code>./setup.sh</code> to initialize</li>
            <li>Run <code>docker-compose up -d</code> to start services</li>
        </ul>

        <h5>Configuration</h5>
        <ul>
            <li><strong>Source Connection:</strong> <code>${source.connection || 'Configure in .env'}</code></li>
            <li><strong>Destination Connection:</strong> <code>${destination.connection || 'Configure in .env'}</code></li>
            <li><strong>Scheduling:</strong> ${technical.scheduling}</li>
            <li><strong>Error Handling:</strong> ${technical.errorHandling}</li>
        </ul>

        <h5>Running the Integration</h5>
        <ul>
            <li><strong>Manual Run:</strong> <code>./run.sh</code></li>
            <li><strong>Scheduled:</strong> Configured via ${technical.scheduling === 'realtime' ? 'event triggers' : 'cron job'}</li>
            <li><strong>Monitoring:</strong> Access Grafana at <code>http://localhost:3000</code></li>
        </ul>

        <h5>Troubleshooting</h5>
        <ul>
            <li>Check logs: <code>docker-compose logs -f</code></li>
            <li>Verify connections: <code>./test-connections.sh</code></li>
            <li>Reset state: <code>./cleanup.sh && ./setup.sh</code></li>
        </ul>
    `;

    document.getElementById('deploymentGuide').innerHTML = guide;
}

// Export All as ZIP
document.getElementById('e2eExportAllBtn')?.addEventListener('click', async () => {
    if (typeof JSZip === 'undefined') {
        ToastManager.error('Export Error', 'JSZip library not loaded.');
        return;
    }

    const zip = new JSZip();
    const projectName = e2eState.project.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

    // Add all artifacts
    Object.entries(e2eState.artifacts).forEach(([category, files]) => {
        Object.entries(files).forEach(([filename, content]) => {
            zip.file(`${category}/${filename}`, content);
        });
    });

    // Add diagrams
    zip.file('diagrams/flow.mmd', document.getElementById('flowMermaidCode')?.value || '');
    zip.file('diagrams/architecture.mmd', document.getElementById('archMermaidCode')?.value || '');

    // Add README
    const readme = `# ${e2eState.project.name}

${e2eState.project.description || 'Integration Solution'}

## Generated by EMS Integration Toolkit

### Source: ${e2eState.source.name} (${e2eState.source.type})
### Destination: ${e2eState.destination.name} (${e2eState.destination.type})

## Quick Start

1. Review and configure the generated code
2. Set up environment variables
3. Run \`./setup.sh\`
4. Start with \`docker-compose up -d\`

## Documentation

See the deployment guide in the \`docs\` folder.
`;
    zip.file('README.md', readme);

    try {
        const blob = await zip.generateAsync({ type: 'blob' });
        saveAs(blob, `${projectName}-integration.zip`);
        ToastManager.success('Export Complete', 'Project ZIP downloaded successfully.');
    } catch (err) {
        ToastManager.error('Export Failed', err.message);
    }
});

// New Project
document.getElementById('e2eNewProjectBtn')?.addEventListener('click', () => {
    if (confirm('Start a new project? Current data will be cleared.')) {
        location.reload();
    }
});

// Save Requirements
document.getElementById('e2eSaveReqBtn')?.addEventListener('click', () => {
    collectRequirements();
    Storage.set('e2eRequirements', e2eState);
    ToastManager.success('Saved', 'Requirements saved to browser storage.');
});
