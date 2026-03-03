
// global variables used for drag-and-drop
let dragSrcEl = null;
let dragGroup = [];

/**
 * Delete a task and all its children (higher indent descendants).
 * @param {HTMLElement} li - The task item to delete
 */
function deleteTaskWithChildren(li) {
    const parentLevel = parseInt(li.dataset.indentLevel || '0', 10);
    const toDelete = [li];
    let next = li.nextSibling;
    
    // collect all children (siblings with higher indent level)
    while (next) {
        const nextLevel = parseInt(next.dataset.indentLevel || '0', 10);
        if (nextLevel > parentLevel) {
            toDelete.push(next);
            next = next.nextSibling;
        } else {
            break; // stop when we reach a sibling at same or lower level
        }
    }
    
    // delete all collected items
    toDelete.forEach(item => item.remove());
}

/**
 * Adjust the indentation level of a list item.
 * @param {HTMLElement} li
 * @param {number} delta  +1 to indent, -1 to outdent
 */
function changeIndent(li, delta) {
    let lvl = parseInt(li.dataset.indentLevel || '0', 10);
    lvl = Math.max(0, Math.min(3, lvl + delta));
    li.dataset.indentLevel = lvl;
    li.classList.remove('indent-level-1', 'indent-level-2', 'indent-level-3');
    if (lvl > 0) li.classList.add('indent-level-' + lvl);
}

function handleDragStart(e) {
    dragSrcEl = this;
    dragGroup = [this];
    const baseLevel = parseInt(this.dataset.indentLevel || '0', 10);
    let next = this.nextSibling;
    while (next && parseInt(next.dataset.indentLevel || '0', 10) > baseLevel) {
        dragGroup.push(next);
        next = next.nextSibling;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', null); // required for Firefox
    dragGroup.forEach(el => el.classList.add('dragging'));
}

function handleDragEnd(e) {
    dragGroup.forEach(el => el.classList.remove('dragging'));
    dragGroup = [];
    dragSrcEl = null;
}

function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    if (dragGroup.length && dragSrcEl !== this) {
        const list = this.parentNode;
        // determine whether to insert before or after based on pointer
        const rect = this.getBoundingClientRect();
        const after = e.clientY > rect.top + rect.height / 2;
        let insertBeforeNode = this;
        if (after && this.nextSibling) {
            insertBeforeNode = this.nextSibling;
        }
        // move entire group
        dragGroup.forEach(el => {
            list.insertBefore(el, insertBeforeNode);
        });
    }
    return false;
}

/**
 * Creates a new task item and appends it to the given list.
 * @param {HTMLElement} list  The <ul> element where the task should go.
 * @param {string} text      The task text.
 * @param {number} indentLevel 0 for no indent, higher values for deeper.
 */
function addTask(list, text, indentLevel = 0) {
    const li = document.createElement('li');
    li.className = 'task-item';
    li.setAttribute('draggable', 'true');
    li.tabIndex = 0; // allow keyboard focus for indenting

    // checkbox for completion (clicking the label no longer toggles state)
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'complete-checkbox';
    checkbox.addEventListener('change', function() {
        li.classList.toggle('completed', this.checked);
    });
    li.appendChild(checkbox);

    if (indentLevel > 0) {
        li.classList.add('indent-level-' + indentLevel);
        li.dataset.indentLevel = indentLevel;
    }

    // Create a span for the text so we can edit only that part
    const taskText = document.createElement('span');
    taskText.textContent = text;
    li.appendChild(taskText);

    // delete button for convenience
    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑';
    delBtn.className = 'delete-btn';
    delBtn.title = 'Delete task';
    delBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const confirmDelete = confirm("Delete this task and its sub-tasks?");
        if (confirmDelete) deleteTaskWithChildren(li);
    });
    li.appendChild(delBtn);

    // controls (outdent/indent buttons)
    const controls = document.createElement('span');
    controls.className = 'controls';
    const outdentBtn = document.createElement('button');
    outdentBtn.textContent = '←';
    outdentBtn.title = 'Outdent';
    outdentBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        changeIndent(li, -1);
    });
    const indentBtn = document.createElement('button');
    indentBtn.textContent = '→';
    indentBtn.title = 'Indent';
    indentBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        changeIndent(li, 1);
    });
    controls.appendChild(outdentBtn);
    controls.appendChild(indentBtn);
    li.appendChild(controls);

    // click on the list item focuses it (checkbox handles completion)
    li.addEventListener('click', function() {
        this.focus();
    });

    // double click to delete (including all children)
    li.addEventListener('dblclick', function() {
        const confirmDelete = confirm("Delete this task and all its sub-tasks?");
        if (confirmDelete) {
            deleteTaskWithChildren(this);
        }
    });

    // right click to edit
    li.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        const newText = prompt("Edit your task:", taskText.textContent);
        if (newText !== null && newText.trim() !== "") {
            taskText.textContent = newText;
        }
    });

    // drag & drop listeners
    li.addEventListener('dragstart', handleDragStart);
    li.addEventListener('dragover', handleDragOver);
    li.addEventListener('drop', handleDrop);
    li.addEventListener('dragend', handleDragEnd);

    // keyboard support: Tab/Shift+Tab to change indent level when focused
    li.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            if (e.shiftKey) {
                changeIndent(this, -1);
            } else {
                changeIndent(this, 1);
            }
        }
    });

    list.appendChild(li);
}

// basic task for restricted sections: checkbox, edit/delete but no indent/drag
function addTaskRestricted(list, text) {
    const li = document.createElement('li');
    li.className = 'task-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'complete-checkbox';
    checkbox.addEventListener('change', function() {
        li.classList.toggle('completed', this.checked);
    });
    li.appendChild(checkbox);

    const taskText = document.createElement('span');
    taskText.textContent = text;
    li.appendChild(taskText);

    // delete button at end
    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑';
    delBtn.className = 'delete-btn';
    delBtn.title = 'Delete task';
    delBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        li.remove();
    });
    li.appendChild(delBtn);

    li.addEventListener('click', function() {
        this.focus();
    });

    li.addEventListener('dblclick', function() {
        const confirmDelete = confirm("Delete this task?");
        if (confirmDelete) {
            this.remove();
        }
    });

    li.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        const newText = prompt("Edit your task:", taskText.textContent);
        if (newText !== null && newText.trim() !== "") {
            taskText.textContent = newText;
        }
    });

    list.appendChild(li);
}

// initial behaviour for the three restricted task-inputs
function wireRestrictedInput(el) {
    const input = el.querySelector('.task-input');
    const addBtn = el.querySelector('.add-btn');
    const list = el.querySelector('.task-list');
    const limit = parseInt(el.getAttribute('data-limit'));

    function tryAdd() {
        if (input.value.trim() === "") return;
        if (list.children.length >= limit) {
            input.classList.add('shake');
            setTimeout(() => input.classList.remove('shake'), 400);
            alert("Don't over-plan! Focus on these 3 first.");
        } else {
            addTaskRestricted(list, input.value);
            input.value = "";
        }
    }

    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            tryAdd();
        }
    });

    if (addBtn) {
        addBtn.addEventListener('click', function() {
            tryAdd();
        });
    }
}

document.querySelectorAll('.section.restricted').forEach(wireRestrictedInput);

// allow dropping onto the list itself (empty space) to append
document.querySelectorAll('.task-list').forEach(list => {
    list.addEventListener('dragover', function(e) {
        e.preventDefault();
    });
    list.addEventListener('drop', function(e) {
        e.preventDefault();
        if (dragGroup.length) {
            dragGroup.forEach(el => this.appendChild(el));
        } else if (dragSrcEl) {
            this.appendChild(dragSrcEl);
        }
    });
});

// braindump text editor with keyboard shortcuts and button handlers
const braindump = document.getElementById('braindump');
if (braindump) {
    // keyboard shortcuts
    braindump.addEventListener('keydown', function(e) {
        // Ctrl+B for bold
        if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            document.execCommand('bold', false, null);
        }
        // Ctrl+I for italic
        else if (e.ctrlKey && e.key === 'i') {
            e.preventDefault();
            document.execCommand('italic', false, null);
        }
        // Ctrl+Shift+U for bullet list
        else if (e.ctrlKey && e.shiftKey && e.key === 'U') {
            e.preventDefault();
            document.execCommand('insertUnorderedList', false, null);
        }
        // Ctrl+Shift+O for numbered list
        else if (e.ctrlKey && e.shiftKey && e.key === 'O') {
            e.preventDefault();
            document.execCommand('insertOrderedList', false, null);
        }
        // Tab for indent (smart: nested lists or spaces)
        else if (e.key === 'Tab') {
            e.preventDefault();
            applySmartIndent();
        }
        // Shift+Tab for outdent
        else if (e.shiftKey && e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('outdent', false, null);
        }
        // Backspace to exit list format when cursor at beginning of li
        else if (e.key === 'Backspace') {
            const sel = window.getSelection();
            if (sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                let node = range.commonAncestorContainer;
                
                // find parent list item
                let liNode = null;
                let tempNode = node;
                while (tempNode) {
                    if (tempNode.tagName === 'LI') {
                        liNode = tempNode;
                        break;
                    }
                    tempNode = tempNode.parentNode;
                }
                
                if (liNode) {
                    // check if cursor is at very start of li
                    const isAtStart = (range.startContainer === liNode || range.startContainer === liNode.firstChild) && range.startOffset === 0;
                    if (isAtStart) {
                        e.preventDefault();
                        // try outdenting first
                        document.execCommand('outdent', false, null);
                        // if still inside a list, convert to plain paragraph
                        const stillInList = !!liNode.closest('ul,ol');
                        if (stillInList) {
                            const p = document.createElement('p');
                            p.innerHTML = liNode.innerHTML;
                            liNode.parentNode.replaceChild(p, liNode);
                            // move caret into paragraph start
                            const newRange = document.createRange();
                            newRange.setStart(p, 0);
                            newRange.collapse(true);
                            sel.removeAllRanges();
                            sel.addRange(newRange);
                        }
                    }
                }
            }
        }
    });
    
    // helper to detect if cursor is in a list and indent accordingly
    function applySmartIndent() {
        const sel = window.getSelection();
        const range = sel.getRangeAt(0);
        let node = range.commonAncestorContainer;
        
        // traverse up to find if we're in a list item
        let inList = false;
        while (node) {
            if (node.tagName === 'LI') {
                inList = true;
                break;
            }
            node = node.parentNode;
        }
        
        if (inList) {
            // we're in a list, use indent command for nested list
            document.execCommand('indent', false, null);
        } else {
            // not in a list, just insert spaces
            document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
        }
    }
    
    // button handlers
    document.getElementById('btn-bold').addEventListener('click', function(e) {
        e.preventDefault();
        braindump.focus();
        document.execCommand('bold', false, null);
    });
    
    document.getElementById('btn-italic').addEventListener('click', function(e) {
        e.preventDefault();
        braindump.focus();
        document.execCommand('italic', false, null);
    });
    
    document.getElementById('btn-indent').addEventListener('click', function(e) {
        e.preventDefault();
        braindump.focus();
        applySmartIndent();
    });
    
    document.getElementById('btn-bullet').addEventListener('click', function(e) {
        e.preventDefault();
        braindump.focus();
        document.execCommand('insertUnorderedList', false, null);
    });
    
    document.getElementById('btn-number').addEventListener('click', function(e) {
        e.preventDefault();
        braindump.focus();
        document.execCommand('insertOrderedList', false, null);
    });
}

// General Planning Logic (with multi‑level indent)
const genInput = document.getElementById('general-input');
const genAddBtn = document.getElementById('general-add');
const genList = document.getElementById('general-list');

// time blocker setup
function initTimeBlocker() {
    const tb = document.getElementById('time-blocker');
    if (!tb) return;
    const firstHour = 6;
    const lastHour = 22;

    // create hour rows
    for (let h = firstHour; h <= lastHour; h++) {
        const block = document.createElement('div');
        block.className = 'hour-block';
        block.dataset.hour = h;
        const label = document.createElement('span');
        label.className = 'hour-label';
        label.textContent = String(h).padStart(2,'0') + ':00';
        block.appendChild(label);
        // open modal to create event starting at this hour
        block.addEventListener('click', (e) => {
            e.stopPropagation();
            // pass null for existingEvent and provide defaultStart as second arg
            openEventModal(null, String(h).padStart(2,'0') + ':00');
        });
        tb.appendChild(block);
    }

    // modal elements
    const modal = document.getElementById('event-modal');
    const inpLabel = document.getElementById('evt-label');
    const inpStart = document.getElementById('evt-start');
    const inpEnd = document.getElementById('evt-end');
    const inpColor = document.getElementById('evt-color');
    const btnSave = document.getElementById('evt-save');
    const btnCancel = document.getElementById('evt-cancel');
    const btnDelete = document.getElementById('evt-delete');
    let currentEditingEv = null;

    function openEventModal(existingEvent, defaultStart) {
        // existingEvent: an existing .tb-event element to edit, or null to create
        currentEditingEv = existingEvent || null;
        // defaultStart in 'HH:MM' or omitted
        modal.classList.remove('hidden');
        const ds = defaultStart || (String(firstHour).padStart(2,'0') + ':00');
        if (currentEditingEv) {
            // prefill from the element's dataset
            const s = currentEditingEv.dataset.start;
            const e = currentEditingEv.dataset.end;
            inpStart.value = s ? toTimeString(parseFloat(s)) : ds;
            inpEnd.value = e ? toTimeString(parseFloat(e)) : String(Math.min(lastHour + 1, parseInt(ds)) + ':00');
            inpLabel.value = currentEditingEv.dataset.label || currentEditingEv.textContent || '';
            inpColor.value = currentEditingEv.dataset.color || '#336699';
            btnDelete.style.display = 'inline-block';
        } else {
            inpStart.value = ds;
            const [h,m] = ds.split(':').map(Number);
            const endH = Math.min(lastHour + 1, h + 1);
            inpEnd.value = String(endH).padStart(2,'0') + ':00';
            inpLabel.value = '';
            inpColor.value = '#336699';
            btnDelete.style.display = 'none';
        }
        inpLabel.focus();
    }

    function closeModal() {
        modal.classList.add('hidden');
    }

    function parseTimeToFloat(t) {
        if (!t) return null;
        const parts = t.split(':').map(Number);
        return parts[0] + (parts[1] || 0) / 60;
    }

    function renderEvent(label, color, startFloat, endFloat) {
        const sample = tb.querySelector('.hour-block');
        const hourHeight = sample ? sample.offsetHeight : 60;
        const top = (startFloat - firstHour) * hourHeight;
        const height = Math.max(6, (endFloat - startFloat) * hourHeight);
        const ev = document.createElement('div');
        ev.className = 'tb-event';
        ev.textContent = label;
        ev.style.background = color || '#336699';
        ev.style.top = top + 'px';
        ev.style.height = height + 'px';
        ev.title = label + ' (' + formatTime(startFloat) + ' - ' + formatTime(endFloat) + ')';
        // store metadata for editing
        ev.dataset.start = String(startFloat);
        ev.dataset.end = String(endFloat);
        ev.dataset.label = label;
        ev.dataset.color = color || '#336699';
        // click to edit
        ev.addEventListener('click', function(e) {
            e.stopPropagation();
            openEventModal(ev);
        });
        tb.appendChild(ev);
    }

    function toTimeString(f) {
        // f may be a float-like string or number
        const num = parseFloat(f);
        const hh = Math.floor(num);
        const mm = Math.round((num - hh) * 60);
        return String(hh).padStart(2,'0') + ':' + String(mm).padStart(2,'0');
    }

    function formatTime(f) {
        const num = parseFloat(f);
        const hh = Math.floor(num);
        const mm = Math.round((num - hh) * 60).toString().padStart(2,'0');
        return String(hh).padStart(2,'0') + ':' + mm;
    }

    btnCancel.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });

    btnSave.addEventListener('click', (e) => {
        e.preventDefault();
        const label = inpLabel.value.trim() || 'Block';
        const start = parseTimeToFloat(inpStart.value);
        const end = parseTimeToFloat(inpEnd.value);
        if (start === null || end === null) { alert('Please provide start and end times.'); return; }
        if (end <= start) { alert('End time must be after start time.'); return; }
        if (currentEditingEv) {
            // update existing element
            currentEditingEv.dataset.start = String(start);
            currentEditingEv.dataset.end = String(end);
            currentEditingEv.dataset.label = label;
            currentEditingEv.dataset.color = inpColor.value;
            currentEditingEv.textContent = label;
            currentEditingEv.style.background = inpColor.value;
            // reposition
            const sample = tb.querySelector('.hour-block');
            const hourHeight = sample ? sample.offsetHeight : 60;
            currentEditingEv.style.top = ((start - firstHour) * hourHeight) + 'px';
            currentEditingEv.style.height = Math.max(6, (end - start) * hourHeight) + 'px';
        } else {
            renderEvent(label, inpColor.value, start, end);
        }
        closeModal();
    });

    btnDelete.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentEditingEv) {
            const ok = confirm('Delete this time block?');
            if (ok) currentEditingEv.remove();
            closeModal();
        }
    });

    // clicking outside modal closes it
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeModal();
    });
}
initTimeBlocker();

function tryAddGeneral() {
    const text = genInput.value.trim();
    if (!text) return;
    addTask(genList, text);
    genInput.value = '';
}

genInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        tryAddGeneral();
    }
});
if (genAddBtn) {
    genAddBtn.addEventListener('click', tryAddGeneral);
}

// keep track of current indent level on the input element
genInput.dataset.indentLevel = 0;

genInput.addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
        e.preventDefault(); // prevent focus move

        let level = parseInt(this.dataset.indentLevel, 10) || 0;
        if (e.shiftKey) {
            level = Math.max(0, level - 1);
        } else {
            level = Math.min(3, level + 1); // cap at 3 levels deep
        }
        this.dataset.indentLevel = level;
        this.style.paddingLeft = (10 + level * 30) + 'px';
    }

    if (e.key === 'Enter' && this.value.trim() !== "") {
        const level = parseInt(this.dataset.indentLevel, 10) || 0;
        addTask(genList, this.value, level);

        // Reset after adding
        this.value = "";
        this.dataset.indentLevel = 0;
        this.style.paddingLeft = "10px";
    }
});