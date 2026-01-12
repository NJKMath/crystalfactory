// Crystal Factory Damage Calculator - Main JavaScript

// Dark mode functionality
let isDarkMode = true;
document.body.setAttribute('data-theme', 'dark');

window.addEventListener('DOMContentLoaded', function() {
    loadThemeImages();
});

function loadThemeImages() {
    const solrockIcon = document.getElementById('solrock-icon');
    const lunatoneIcon = document.getElementById('lunatone-icon');
    
    solrockIcon.alt = '☀️';
    lunatoneIcon.alt = '🌙';
    
    try {
        // Go up one directory level from damagecalc to Gen2FactoryWebsite, then into DarkModeIcons
        solrockIcon.src = '../DarkModeIcons/Solrock.png';
        lunatoneIcon.src = '../DarkModeIcons/Lunatone.png';
    } catch (error) {
        console.warn('Failed to load theme images:', error);
    }
}

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
}

// Get current level from field buttons
function getCurrentLevel() {
    const levelRadios = document.querySelectorAll('input[name="levelSetting"]');
    for (let radio of levelRadios) {
        if (radio.checked) {
            return parseInt(radio.value);
        }
    }
    return 100;
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing calculator...');
    console.log('SETDEX_GSC available:', typeof SETDEX_GSC !== 'undefined');
    console.log('POKEDEX_GSC available:', typeof POKEDEX_GSC !== 'undefined');
    console.log('MOVES_GSC available:', typeof MOVES_GSC !== 'undefined');
    console.log('ITEMS_GSC available:', typeof ITEMS_GSC !== 'undefined');
    console.log('TYPE_CHART_GSC available:', typeof TYPE_CHART_GSC !== 'undefined');
    
    initializeSetSelectors();
    initializeDefaultValues();
});

function initializeSetSelectors() {
    console.log('Initializing set selectors...');
    
    if (typeof SETDEX_GSC === 'undefined') {
        console.error('SETDEX_GSC not loaded');
        return;
    }
    
    const setNames = Object.keys(SETDEX_GSC).sort();
    console.log('Found', setNames.length, 'sets');
    
    // Initialize both set selectors
    initializeAutocomplete('#p1 .set-selector', '#p1 .set-dropdown', setNames, 'L');
    initializeAutocomplete('#p2 .set-selector', '#p2 .set-dropdown', setNames, 'R');
}

function initializeAutocomplete(inputSelector, dropdownSelector, options, side) {
    const input = document.querySelector(inputSelector);
    const dropdown = document.querySelector(dropdownSelector);
    
    if (!input || !dropdown) {
        console.error('Input or dropdown not found:', inputSelector, dropdownSelector);
        return;
    }
    
    let selectedIndex = -1;
    
    // Filter and show options with moves
    function updateDropdown() {
        const value = input.value.toLowerCase();
        dropdown.innerHTML = '';
        
        if (value.length === 0) {
            dropdown.classList.remove('show');
            return;
        }
        
        // Filter options that start with the input value
        const filtered = options.filter(opt => opt.toLowerCase().startsWith(value));
        
        if (filtered.length === 0) {
            dropdown.classList.remove('show');
            return;
        }
        
        // Show up to 10 matches
        filtered.slice(0, 10).forEach((opt, index) => {
            const div = document.createElement('div');
            div.className = 'set-option';
            
            // Create set name span
            const nameSpan = document.createElement('span');
            nameSpan.className = 'set-name';
            nameSpan.textContent = opt;
            div.appendChild(nameSpan);
            
            // Get moves for this set and display them
            const set = SETDEX_GSC[opt];
            if (set && set.moves) {
                const movesSpan = document.createElement('span');
                movesSpan.className = 'set-moves';
                movesSpan.textContent = ' (' + set.moves.join(' / ') + ')';
                div.appendChild(movesSpan);
            }
            
            div.addEventListener('click', function() {
                selectOption(opt);
            });
            dropdown.appendChild(div);
        });
        
        dropdown.classList.add('show');
        selectedIndex = -1;
    }
    
    function selectOption(value) {
        input.value = value;
        dropdown.classList.remove('show');
        loadSet(value, side);
    }
    
    // Input event
    input.addEventListener('input', updateDropdown);
    
    // Keyboard navigation
    input.addEventListener('keydown', function(e) {
        const options = dropdown.querySelectorAll('.set-option');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, options.length - 1);
            updateSelection(options);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, -1);
            updateSelection(options);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && options[selectedIndex]) {
                const setName = options[selectedIndex].querySelector('.set-name').textContent;
                selectOption(setName);
            }
        } else if (e.key === 'Escape') {
            dropdown.classList.remove('show');
        }
    });
    
    function updateSelection(options) {
        options.forEach((opt, index) => {
            if (index === selectedIndex) {
                opt.style.background = '#e3e3e3';
            } else {
                opt.style.background = '';
            }
        });
    }
    
    // Click outside to close
    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
    
    // Focus to show dropdown
    input.addEventListener('focus', function() {
        if (input.value.length > 0) {
            updateDropdown();
        }
    });
}

function loadSet(setName, side) {
    if (!setName || typeof SETDEX_GSC === 'undefined' || typeof POKEDEX_GSC === 'undefined' || typeof MOVES_GSC === 'undefined') {
        return;
    }
    
    const set = SETDEX_GSC[setName];
    if (!set) {
        console.error('Set not found:', setName);
        return;
    }
    
    console.log('Loading set:', setName, 'for side:', side);
    
    // Extract Pokemon name (everything before the last hyphen)
    const lastHyphen = setName.lastIndexOf('-');
    const pokemonName = setName.substring(0, lastHyphen);
    
    const pokemon = POKEDEX_GSC[pokemonName];
    if (!pokemon) {
        console.error('Pokemon not found:', pokemonName);
        return;
    }
    
    // Update the move result header with Pokemon name
    const resultHeader = document.getElementById('resultHeader' + side);
    if (resultHeader) {
        resultHeader.textContent = pokemonName + "'s Moves";
    }
    
    // Update types
    const type1Elem = document.getElementById('type' + side + '1');
    const type2Elem = document.getElementById('type' + side + '2');
    
    if (type1Elem) {
        type1Elem.textContent = pokemon.t1;
    }
    if (type2Elem) {
        type2Elem.textContent = pokemon.t2 || '';
    }
    
    // Update base stats
    const stats = ['hp', 'at', 'df', 'sa', 'sd', 'sp'];
    
    stats.forEach(function(stat) {
        const baseInput = document.querySelector('#p' + (side === 'L' ? '1' : '2') + ' tr.' + stat + ' .base');
        if (baseInput && pokemon.bs[stat]) {
            baseInput.value = pokemon.bs[stat];
        }
    });
    
    // Update item
    const itemSelect = document.getElementById('item' + side + '1');
    if (itemSelect && set.item) {
        // Find and select the item
        for (let i = 0; i < itemSelect.options.length; i++) {
            if (itemSelect.options[i].value === set.item || itemSelect.options[i].text === set.item) {
                itemSelect.selectedIndex = i;
                break;
            }
        }
    }
    
    // Update moves and move result labels
    const moveSelectors = document.querySelectorAll('#p' + (side === 'L' ? '1' : '2') + ' .move-selector');
    const moveBPs = document.querySelectorAll('#p' + (side === 'L' ? '1' : '2') + ' .move-bp');
    const moveTypes = document.querySelectorAll('#p' + (side === 'L' ? '1' : '2') + ' .move-type');
    
    set.moves.forEach(function(moveName, index) {
        // Update move selector
        if (moveSelectors[index]) {
            for (let i = 0; i < moveSelectors[index].options.length; i++) {
                if (moveSelectors[index].options[i].value === moveName || 
                    moveSelectors[index].options[i].text === moveName) {
                    moveSelectors[index].selectedIndex = i;
                    break;
                }
            }
        }
        
        // Update move BP and type
        const moveData = MOVES_GSC[moveName];
        if (moveData) {
            if (moveBPs[index]) {
                moveBPs[index].value = moveData.bp;
            }
            if (moveTypes[index]) {
                for (let i = 0; i < moveTypes[index].options.length; i++) {
                    if (moveTypes[index].options[i].value === moveData.type) {
                        moveTypes[index].selectedIndex = i;
                        break;
                    }
                }
            }
        }
        
        // Update result move labels at the top
        const resultMoveLabel = document.getElementById('resultMove' + side + (index + 1));
        if (resultMoveLabel) {
            const label = resultMoveLabel.nextElementSibling;
            if (label) {
                label.textContent = moveName;
            }
        }
    });
    
    // Trigger stat calculation
    calculateStats(side);
    
    // Trigger damage calculation
    setTimeout(updateDamageDisplay, 100);
}

function calculateStats(side) {
    const panelId = side === 'L' ? '#p1' : '#p2';
    const level = getCurrentLevel();
    const dvTier = parseInt(document.querySelector(panelId + ' .dvsoverride').value) || 15;
    
    // Update level display
    const levelDisplay = document.getElementById('levelDisplay' + side);
    if (levelDisplay) {
        levelDisplay.textContent = level;
    }
    
    // Get Stat Exp setting
    const statExpRadios = document.querySelectorAll('input[name="statExp"]');
    let statExp = 0;
    statExpRadios.forEach(function(radio) {
        if (radio.checked) {
            statExp = parseInt(radio.value);
        }
    });
    
    // Calculate stat exp bonus (sqrt(statExp) / 4, max 63)
    const statExpBonus = Math.min(Math.floor(Math.sqrt(statExp) / 4), 63);
    
    // Calculate and display stats
    const stats = ['hp', 'at', 'df', 'sa', 'sd', 'sp'];
    
    stats.forEach(function(stat) {
        const baseInput = document.querySelector(panelId + ' tr.' + stat + ' .base');
        const totalSpan = document.querySelector(panelId + ' tr.' + stat + ' .total');
        const dvInput = document.querySelector(panelId + ' tr.' + stat + ' .dvs');
        
        if (baseInput && totalSpan) {
            const base = parseInt(baseInput.value) || 100;
            let calculatedStat;
            
            // Update DV display (Special Attack and Special Defense share the same DV)
            if (dvInput) {
                dvInput.value = dvTier;
            }
            
            if (stat === 'hp') {
                // HP formula: ((Base + DV) * 2 + StatExpBonus) * Level / 100 + Level + 10
                calculatedStat = Math.floor(((base + dvTier) * 2 + statExpBonus) * level / 100) + level + 10;
            } else {
                // Other stats: ((Base + DV) * 2 + StatExpBonus) * Level / 100 + 5
                calculatedStat = Math.floor(((base + dvTier) * 2 + statExpBonus) * level / 100) + 5;
            }
            
            totalSpan.textContent = calculatedStat;
        }
    });
    
    // Update current HP and max HP displays
    const currentHpInput = document.querySelector(panelId + ' .current-hp');
    const maxHpSpan = document.querySelector(panelId + ' .max-hp');
    const hpTotal = document.querySelector(panelId + ' tr.hp .total');
    
    if (currentHpInput && maxHpSpan && hpTotal) {
        const maxHp = parseInt(hpTotal.textContent);
        maxHpSpan.textContent = maxHp;
        currentHpInput.value = maxHp;
        
        // Update percentage to 100%
        const percentHpInput = document.querySelector(panelId + ' .percent-hp');
        if (percentHpInput) {
            percentHpInput.value = 100;
        }
    }
}

// Update percentage when current HP changes
function updateHPPercentage(currentHpInput) {
    const panel = currentHpInput.closest('.poke-info');
    const maxHpSpan = panel.querySelector('.max-hp');
    const percentHpInput = panel.querySelector('.percent-hp');
    
    if (maxHpSpan && percentHpInput) {
        const currentHp = parseInt(currentHpInput.value) || 0;
        const maxHp = parseInt(maxHpSpan.textContent) || 1;
        const percentage = Math.floor(currentHp * 1000 / maxHp) / 10;
        percentHpInput.value = percentage;
    }
}

// Update current HP when percentage changes
function updateCurrentHP(percentHpInput) {
    const panel = percentHpInput.closest('.poke-info');
    const maxHpSpan = panel.querySelector('.max-hp');
    const currentHpInput = panel.querySelector('.current-hp');
    
    if (maxHpSpan && currentHpInput) {
        const percentage = parseFloat(percentHpInput.value) || 0;
        const maxHp = parseInt(maxHpSpan.textContent) || 0;
        const currentHp = Math.floor(maxHp * percentage / 100);
        currentHpInput.value = currentHp;
    }
}

function initializeDefaultValues() {
    // Populate item dropdowns
    if (typeof ITEMS_GSC !== 'undefined') {
        const itemSelects = document.querySelectorAll('.item');
        itemSelects.forEach(function(select) {
            ITEMS_GSC.forEach(function(item) {
                const option = document.createElement('option');
                option.value = item;
                option.textContent = item;
                select.appendChild(option);
            });
        });
    }
    
    // Populate move dropdowns
    if (typeof MOVES_GSC !== 'undefined') {
        const moveSelects = document.querySelectorAll('.move-selector');
        const moveNames = Object.keys(MOVES_GSC).sort();
        
        moveSelects.forEach(function(select) {
            // Add blank option
            const blankOption = document.createElement('option');
            blankOption.value = '';
            blankOption.textContent = '---';
            select.appendChild(blankOption);
            
            moveNames.forEach(function(moveName) {
                const option = document.createElement('option');
                option.value = moveName;
                option.textContent = moveName;
                select.appendChild(option);
            });
        });
    }
    
    // Populate type dropdowns
    if (typeof TYPES_GSC !== 'undefined') {
        const typeSelects = document.querySelectorAll('.move-type');
        
        typeSelects.forEach(function(select) {
            TYPES_GSC.forEach(function(type) {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                select.appendChild(option);
            });
        });
    }
    
    // Calculate initial stats
    calculateStats('L');
    calculateStats('R');
    
    // Add event listeners for DV tier changes
    document.querySelectorAll('.dvsoverride').forEach(function(input) {
        input.addEventListener('change', function() {
            const panel = this.closest('.poke-info');
            const side = panel.id === 'p1' ? 'L' : 'R';
            calculateStats(side);
            updateDamageDisplay();
        });
    });
    
    // Add event listeners for Stat Exp changes
    document.querySelectorAll('input[name="statExp"]').forEach(function(radio) {
        radio.addEventListener('change', function() {
            calculateStats('L');
            calculateStats('R');
            updateDamageDisplay();
        });
    });
    
    // Add event listeners for Level setting changes
    document.querySelectorAll('input[name="levelSetting"]').forEach(function(radio) {
        radio.addEventListener('change', function() {
            calculateStats('L');
            calculateStats('R');
            updateDamageDisplay();
        });
    });
    
    // Add event listeners for things that trigger damage recalculation
    // Boosts
    document.querySelectorAll('.boost').forEach(function(select) {
        select.addEventListener('change', updateDamageDisplay);
    });
    
    // Move changes
    document.querySelectorAll('.move-selector, .move-bp, .move-type, .move-crit').forEach(function(elem) {
        elem.addEventListener('change', updateDamageDisplay);
    });
    
    // Status changes
    document.querySelectorAll('.status').forEach(function(elem) {
        elem.addEventListener('change', updateDamageDisplay);
    });
    
    // Current HP changes (affects KO calculations)
    document.querySelectorAll('.current-hp').forEach(function(elem) {
        elem.addEventListener('input', function() {
            updateHPPercentage(this);
            updateDetailedDamageDisplay();
        });
    });
    
    // Percentage HP changes (updates current HP)
    document.querySelectorAll('.percent-hp').forEach(function(elem) {
        elem.addEventListener('input', function() {
            updateCurrentHP(this);
            updateDetailedDamageDisplay();
        });
    });
    
    // Field conditions
    document.querySelectorAll('input[name="gscWeather"], #reflectL, #reflectR, #lightScreenL, #lightScreenR, #leechSeedL, #leechSeedR').forEach(function(elem) {
        elem.addEventListener('change', updateDamageDisplay);
    });
    
    // Move selection radio buttons
    document.querySelectorAll('input[name="resultMove"]').forEach(function(radio) {
        radio.addEventListener('change', updateDetailedDamageDisplay);
    });
    
    // Reset boost buttons
    document.getElementById('resetBoostsL').addEventListener('click', function() {
        document.querySelectorAll('#p1 .boost').forEach(function(select) {
            select.value = '0';
        });
        updateDamageDisplay();
    });
    
    document.getElementById('resetBoostsR').addEventListener('click', function() {
        document.querySelectorAll('#p2 .boost').forEach(function(select) {
            select.value = '0';
        });
        updateDamageDisplay();
    });
}