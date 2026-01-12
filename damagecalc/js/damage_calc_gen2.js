// Gen 2 Damage Calculator

// Stage multipliers for Gen II (numerators, all divided by 100)
const STAGE_MULTIPLIERS = [25, 28, 33, 40, 50, 66, 100, 150, 200, 250, 300, 350, 400];

// Get stat with stage multiplier applied
function getStatWithBoost(baseStat, stage) {
    const stageIndex = stage + 6; // Convert -6 to +6 range to 0-12 array index
    return Math.floor(baseStat * STAGE_MULTIPLIERS[stageIndex] / 100);
}

// Calculate Gen 2 damage
function calculateGen2Damage(attacker, defender, move, field) {
    // If move has 0 power, return no damage
    if (!move.power || move.power === 0) {
        return { rolls: [], min: 0, max: 0, minPercent: 0, maxPercent: 0 };
    }

    const level = attacker.level;
    const power = move.power;
    
    // Determine if move is physical or special
    // In Gen 2, move category is determined by type
    const physicalTypes = ['Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel'];
    const isPhysical = physicalTypes.includes(move.type);
    
    // Get attacking stat (with boosts)
    let attackStat;
    let attackStage;
    if (isPhysical) {
        attackStat = attacker.stats.atk;
        attackStage = attacker.boosts.atk || 0;
    } else {
        attackStat = attacker.stats.spa;
        attackStage = attacker.boosts.spa || 0;
    }
    
    // Get defending stat (with boosts)
    let defenseStat;
    let defenseStage;
    if (isPhysical) {
        defenseStat = defender.stats.def;
        defenseStage = defender.boosts.def || 0;
    } else {
        // In Gen 2, special defense uses the single "Special" stat
        defenseStat = defender.stats.spd;
        defenseStage = defender.boosts.spd || 0;
    }
    
    // Apply stage multipliers
    let effectiveAttack = getStatWithBoost(attackStat, attackStage);
    let effectiveDefense = getStatWithBoost(defenseStat, defenseStage);
    
    // For critical hits: ignore stat modifiers if defender's boost >= attacker's boost
    const isCrit = move.isCrit || false;
    if (isCrit) {
        if (defenseStage >= attackStage) {
            effectiveAttack = attackStat;
            effectiveDefense = defenseStat;
        }
    }
    
    // Apply Reflect/Light Screen (doubles defense, unless crit)
    if (!isCrit) {
        if (isPhysical && field.reflectDefender) {
            effectiveDefense *= 2;
        } else if (!isPhysical && field.lightScreenDefender) {
            effectiveDefense *= 2;
        }
    }
    
    // Explosion/Selfdestruct halves defense
    if (move.name === 'Explosion' || move.name === 'Selfdestruct' || move.name === 'Self-Destruct') {
        effectiveDefense = Math.floor(effectiveDefense / 2);
        if (effectiveDefense < 1) effectiveDefense = 1;
    }
    
    // Base damage calculation
    let baseDamage = Math.floor((2 * level / 5) + 2);
    baseDamage = Math.floor(baseDamage * power);
    baseDamage = Math.floor(baseDamage * effectiveAttack / effectiveDefense);
    baseDamage = Math.floor(baseDamage / 50);
    
    // Item modifier (type-enhancing items)
    let itemMod = 1;
    if (attacker.item && move.type) {
        // Type-enhancing items give 1.1x boost in Gen 2
        const typeBoostItems = {
            'Normal': ['Pink Bow', 'Polkadot Bow'],
            'Fire': ['Charcoal'],
            'Water': ['Mystic Water'],
            'Electric': ['Magnet'],
            'Grass': ['Miracle Seed'],
            'Ice': ['NeverMeltIce'],
            'Fighting': ['BlackBelt'],
            'Poison': ['Poison Barb'],
            'Ground': ['Soft Sand'],
            'Flying': ['Sharp Beak'],
            'Psychic': ['TwistedSpoon'],
            'Bug': ['SilverPowder'],
            'Rock': ['Hard Stone'],
            'Ghost': ['Spell Tag'],
            'Dragon': ['Dragon Fang'],
            'Dark': ['BlackGlasses'],
            'Steel': ['Metal Coat']
        };
        
        const boostItems = typeBoostItems[move.type];
        if (boostItems && boostItems.includes(attacker.item)) {
            itemMod = 1.1;
        }
    }
    baseDamage = Math.floor(baseDamage * itemMod);
    
    // Critical hit modifier
    let criticalMod = isCrit ? 2 : 1;
    // Flail, Reversal, Future Sight never crit
    if (move.name === 'Flail' || move.name === 'Reversal' || move.name === 'Future Sight') {
        criticalMod = 1;
    }
    baseDamage = Math.floor(baseDamage * criticalMod);
    
    // Add 2
    baseDamage = baseDamage + 2;
    
    // TODO: Triple Kick handling (TK modifier)
    
    // Weather modifier
    let weatherMod = 1;
    if (field.weather) {
        if (field.weather === 'Sun') {
            if (move.type === 'Fire') weatherMod = 1.5;
            else if (move.type === 'Water') weatherMod = 0.5;
        } else if (field.weather === 'Rain') {
            if (move.type === 'Water') weatherMod = 1.5;
            else if (move.type === 'Fire') weatherMod = 0.5;
        }
        
        // SolarBeam is halved in rain
        if (move.name === 'SolarBeam' && field.weather === 'Rain') {
            weatherMod = 0.5;
        }
    }
    baseDamage = Math.floor(baseDamage * weatherMod);
    
    // Badge boost (always 1 in Factory/Tower)
    
    // STAB
    let stabMod = 1;
    if (attacker.types && attacker.types.includes(move.type)) {
        stabMod = 1.5;
    }
    baseDamage = Math.floor(baseDamage * stabMod);
    
    // Type effectiveness
    let typeMod = getTypeEffectiveness(move.type, defender.types, field);
    baseDamage = Math.floor(baseDamage * typeMod);
    
    // TODO: MoveMod for Rollout
    // TODO: Fury Cutter and Rage (not in Factory)
    
    // Calculate damage rolls (random multiplier from 217-255)
    const rolls = [];
    for (let i = 217; i <= 255; i++) {
        let damage = Math.floor(baseDamage * i / 255);
        // Flail and Reversal always use max roll
        if (move.name === 'Flail' || move.name === 'Reversal') {
            damage = baseDamage;
        }
        rolls.push(damage);
    }
    
    // TODO: DoubleDmg modifier
    // - Pursuit if target switching
    // - Stomp if target used Minimize
    // - Gust/Twister if target using Fly
    // - Earthquake/Magnitude if target using Dig
    
    const minDamage = Math.min(...rolls);
    const maxDamage = Math.max(...rolls);
    const defenderHP = defender.stats.hp;
    
    const minPercent = Math.floor(minDamage * 1000 / defenderHP) / 10;
    const maxPercent = Math.floor(maxDamage * 1000 / defenderHP) / 10;
    
    return {
        rolls: rolls,
        min: minDamage,
        max: maxDamage,
        minPercent: minPercent,
        maxPercent: maxPercent
    };
}

// Get type effectiveness
function getTypeEffectiveness(attackType, defenderTypes, field) {
    if (!attackType || !defenderTypes) return 1;
    
    // Struggle, Future Sight, Beat Up always have 1x effectiveness
    // (Beat Up not in Factory but including for completeness)
    
    let effectiveness = 1;
    
    defenderTypes.forEach(function(defType) {
        if (!defType) return;
        
        const matchup = getTypeMatchup(attackType, defType);
        effectiveness *= matchup;
    });
    
    return effectiveness;
}

// Type chart for Gen 2
function getTypeMatchup(attackType, defenseType) {
    // Type chart (returns multiplier)
    const chart = {
        'Normal': { 'Rock': 0.5, 'Steel': 0.5, 'Ghost': 0 },
        'Fire': { 'Fire': 0.5, 'Water': 0.5, 'Grass': 2, 'Ice': 2, 'Bug': 2, 'Rock': 0.5, 'Dragon': 0.5, 'Steel': 2 },
        'Water': { 'Fire': 2, 'Water': 0.5, 'Grass': 0.5, 'Ground': 2, 'Rock': 2, 'Dragon': 0.5 },
        'Electric': { 'Water': 2, 'Electric': 0.5, 'Grass': 0.5, 'Ground': 0, 'Flying': 2, 'Dragon': 0.5 },
        'Grass': { 'Fire': 0.5, 'Water': 2, 'Grass': 0.5, 'Poison': 0.5, 'Ground': 2, 'Flying': 0.5, 'Bug': 0.5, 'Rock': 2, 'Dragon': 0.5, 'Steel': 0.5 },
        'Ice': { 'Water': 0.5, 'Grass': 2, 'Ice': 0.5, 'Ground': 2, 'Flying': 2, 'Dragon': 2, 'Steel': 0.5 },
        'Fighting': { 'Normal': 2, 'Ice': 2, 'Poison': 0.5, 'Flying': 0.5, 'Psychic': 0.5, 'Bug': 0.5, 'Rock': 2, 'Dark': 2, 'Steel': 2, 'Ghost': 0 },
        'Poison': { 'Grass': 2, 'Poison': 0.5, 'Ground': 0.5, 'Rock': 0.5, 'Ghost': 0.5, 'Steel': 0 },
        'Ground': { 'Fire': 2, 'Electric': 2, 'Grass': 0.5, 'Poison': 2, 'Flying': 0, 'Bug': 0.5, 'Rock': 2, 'Steel': 2 },
        'Flying': { 'Electric': 0.5, 'Grass': 2, 'Fighting': 2, 'Bug': 2, 'Rock': 0.5, 'Steel': 0.5 },
        'Psychic': { 'Fighting': 2, 'Poison': 2, 'Psychic': 0.5, 'Dark': 0, 'Steel': 0.5 },
        'Bug': { 'Fire': 0.5, 'Grass': 2, 'Fighting': 0.5, 'Poison': 2, 'Flying': 0.5, 'Psychic': 2, 'Ghost': 0.5, 'Dark': 2, 'Steel': 0.5 },
        'Rock': { 'Fire': 2, 'Ice': 2, 'Fighting': 0.5, 'Ground': 0.5, 'Flying': 2, 'Bug': 2, 'Steel': 0.5 },
        'Ghost': { 'Normal': 0, 'Psychic': 2, 'Ghost': 2, 'Dark': 0.5, 'Steel': 0.5 },
        'Dragon': { 'Dragon': 2, 'Steel': 0.5 },
        'Dark': { 'Fighting': 0.5, 'Psychic': 2, 'Ghost': 2, 'Dark': 0.5, 'Steel': 0.5 },
        'Steel': { 'Fire': 0.5, 'Water': 0.5, 'Electric': 0.5, 'Ice': 2, 'Rock': 2, 'Steel': 0.5 }
    };
    
    // Get effectiveness
    let effectiveness = 1;
    if (chart[attackType] && chart[attackType][defenseType] !== undefined) {
        effectiveness = chart[attackType][defenseType];
    }
    
    return effectiveness;
}

// Calculate end-of-turn damage/healing for a Pokemon and return detailed info
function calculateEndOfTurnEffects(defenderData, attackerData, fieldData, turn) {
    let totalDamage = 0;
    const effects = [];
    
    // Defender's Leftovers healing (negative damage = healing)
    if (defenderData.item === 'Leftovers') {
        const healing = Math.floor(defenderData.stats.hp / 16);
        totalDamage -= healing;
        effects.push({ name: 'Leftovers', amount: -healing });
    }
    
    // Poison damage (1/8 max HP)
    if (defenderData.status === 'Poisoned') {
        const damage = Math.floor(defenderData.stats.hp / 8);
        totalDamage += damage;
        effects.push({ name: 'Poison', amount: damage });
    }
    
    // Burn damage (1/8 max HP)
    if (defenderData.status === 'Burned') {
        const damage = Math.floor(defenderData.stats.hp / 8);
        totalDamage += damage;
        effects.push({ name: 'Burn', amount: damage });
    }
    
    // Toxic damage (N/16 max HP, where N is turn counter)
    if (defenderData.status === 'Badly Poisoned') {
        const damage = Math.floor(defenderData.stats.hp * turn / 16);
        totalDamage += damage;
        effects.push({ name: 'Toxic (' + turn + '/16)', amount: damage });
    }
    
    // Leech Seed - defender is seeded (loses 1/8 HP)
    if (defenderData.hasLeechSeed) {
        const damage = Math.floor(defenderData.stats.hp / 8);
        totalDamage += damage;
        effects.push({ name: 'Leech Seed', amount: damage });
    }
    
    // Leech Seed - attacker is seeded (defender heals 1/8 of attacker's max HP)
    if (attackerData.hasLeechSeed) {
        const healing = Math.floor(attackerData.stats.hp / 8);
        totalDamage -= healing;
        effects.push({ name: 'Leech Seed (healing)', amount: -healing });
    }
    
    return {
        totalDamage: totalDamage,
        effects: effects
    };
}

// Calculate multi-turn KO probabilities
function calculateMultiTurnKO(attackerData, defenderData, move, fieldData) {
    // Get the basic damage calculation
    const damageResult = calculateGen2Damage(attackerData, defenderData, move, fieldData);
    
    if (damageResult.max === 0) {
        return { turns: null, probability: 0, details: [], koText: 'does no damage' };
    }
    
    // Get defender's current HP
    const initialHP = defenderData.currentHP || defenderData.stats.hp;
    
    // Convert damage rolls to probability distribution
    const damageDist = {};
    damageResult.rolls.forEach(dmg => {
        damageDist[dmg] = (damageDist[dmg] || 0) + 1;
    });
    
    // Normalize to probabilities (0-1 range)
    const totalRolls = damageResult.rolls.length;
    for (let dmg in damageDist) {
        damageDist[dmg] /= totalRolls;
    }
    
    // Initialize HP states (probability distribution over HP values)
    let hpStates = { [initialHP]: 1.0 };
    
    const turnDetails = [];
    const maxTurns = 4;
    
    // Track cumulative damage for display purposes
    let cumulativeMinDamage = 0;
    let cumulativeMaxDamage = 0;
    
    for (let turn = 1; turn <= maxTurns; turn++) {
        const newHpStates = {};
        let koProb = 0;
        
        // Update cumulative damage from attacks
        cumulativeMinDamage += damageResult.min;
        cumulativeMaxDamage += damageResult.max;
        
        // Calculate end-of-turn effects for this turn
        const eotEffects = calculateEndOfTurnEffects(defenderData, attackerData, fieldData, turn);
        const eotDamage = eotEffects.totalDamage;
        
        // Apply damage rolls to all current HP states
        for (let hp in hpStates) {
            const hpValue = parseInt(hp);
            const hpProb = hpStates[hp];
            
            for (let dmg in damageDist) {
                const dmgValue = parseInt(dmg);
                const dmgProb = damageDist[dmg];
                
                let newHP = hpValue - dmgValue;
                
                // Check for KO from attack damage
                if (newHP <= 0) {
                    koProb += hpProb * dmgProb;
                } else {
                    // Apply end-of-turn effects
                    // Only apply damaging effects if they would contribute to KO
                    // Ignore healing effects on KO turn since KO happens first
                    if (eotDamage > 0) {
                        // Damaging effect - apply it
                        newHP -= eotDamage;
                        
                        // Check for KO from end-of-turn effects
                        if (newHP <= 0) {
                            koProb += hpProb * dmgProb;
                        } else {
                            // Add to new HP states
                            newHpStates[newHP] = (newHpStates[newHP] || 0) + hpProb * dmgProb;
                        }
                    } else if (eotDamage < 0) {
                        // Healing effect - apply it (KO not possible this turn from attack)
                        newHP -= eotDamage; // Subtract negative = add healing
                        newHpStates[newHP] = (newHpStates[newHP] || 0) + hpProb * dmgProb;
                    } else {
                        // No end-of-turn effects
                        newHpStates[newHP] = (newHpStates[newHP] || 0) + hpProb * dmgProb;
                    }
                }
            }
        }
        
        // Record turn details
        turnDetails.push({
            turn: turn,
            minDamage: damageResult.min,
            maxDamage: damageResult.max,
            cumulativeMin: cumulativeMinDamage,
            cumulativeMax: cumulativeMaxDamage,
            eotEffects: eotEffects,
            koProb: koProb
        });
        
        // If we have a guaranteed KO this turn, return it
        if (koProb >= 0.999) {
            const koType = turn === 1 ? 'OHKO' : turn === 2 ? '2HKO' : turn === 3 ? '3HKO' : '4HKO';
            return {
                turns: turn,
                probability: 100,
                details: turnDetails,
                koText: 'guaranteed ' + koType
            };
        }
        
        // If we have a partial KO this turn, return it
        if (koProb > 0) {
            const koType = turn === 1 ? 'OHKO' : turn === 2 ? '2HKO' : turn === 3 ? '3HKO' : '4HKO';
            const koPercent = Math.round(koProb * 1000) / 10;
            return {
                turns: turn,
                probability: koPercent,
                details: turnDetails,
                koText: koPercent + '% chance to ' + koType
            };
        }
        
        // Continue with remaining HP states
        hpStates = newHpStates;
        
        // If no remaining states, we've KO'd
        if (Object.keys(hpStates).length === 0) {
            break;
        }
    }
    
    // If we haven't KO'd by turn 4, it's a 5+HKO
    return {
        turns: 5,
        probability: 0,
        details: turnDetails,
        koText: '5HKO or more'
    };
}

// Calculate and display damage for all moves
function updateDamageDisplay() {
    // Check if both Pokemon have sets loaded
    const p1Data = getPokemonData('L');
    const p2Data = getPokemonData('R');
    
    if (!p1Data || !p2Data) {
        return; // Not ready to calculate
    }
    
    const field = getFieldData();
    
    // Calculate P1's moves against P2
    for (let i = 1; i <= 4; i++) {
        const move = getMoveData('L', i);
        if (move && move.power > 0) {
            const result = calculateGen2Damage(p1Data, p2Data, move, { ...field, reflectDefender: field.reflectR, lightScreenDefender: field.lightScreenR });
            displayDamageResult('L', i, result);
        } else {
            displayDamageResult('L', i, null);
        }
    }
    
    // Calculate P2's moves against P1
    for (let i = 1; i <= 4; i++) {
        const move = getMoveData('R', i);
        if (move && move.power > 0) {
            const result = calculateGen2Damage(p2Data, p1Data, move, { ...field, reflectDefender: field.reflectL, lightScreenDefender: field.lightScreenL });
            displayDamageResult('R', i, result);
        } else {
            displayDamageResult('R', i, null);
        }
    }
    
    // Update detailed display for currently selected move
    updateDetailedDamageDisplay();
}

// Display damage result next to move button
function displayDamageResult(side, moveNum, result) {
    const damageSpan = document.getElementById('resultDamage' + side + moveNum);
    if (!damageSpan) return;
    
    if (!result) {
        damageSpan.textContent = '0 - 0%';
    } else if (result.max === 0) {
        damageSpan.textContent = '0 - 0%';
    } else {
        damageSpan.textContent = result.minPercent + '% - ' + result.maxPercent + '%';
    }
}

// Update detailed damage display based on selected move
function updateDetailedDamageDisplay() {
    const selectedMoveRadio = document.querySelector('input[name="resultMove"]:checked');
    if (!selectedMoveRadio) return;
    
    const moveId = selectedMoveRadio.id;
    const side = moveId.includes('L') ? 'L' : 'R';
    const moveNum = parseInt(moveId.match(/\d+/)[0]);
    
    const attackerSide = side;
    const defenderSide = side === 'L' ? 'R' : 'L';
    
    const attackerData = getPokemonData(attackerSide);
    const defenderData = getPokemonData(defenderSide);
    const move = getMoveData(attackerSide, moveNum);
    
    if (!attackerData || !defenderData || !move) {
        document.getElementById('mainResult').textContent = 'Select Pokemon and moves to calculate damage';
        document.getElementById('damageValues').textContent = '';
        // Remove existing details if present
        const existingDetails = document.getElementById('koDetails');
        if (existingDetails) {
            existingDetails.remove();
        }
        return;
    }
    
    const field = getFieldData();
    const isDefenderL = defenderSide === 'L';
    const fieldForCalc = {
        ...field,
        reflectDefender: isDefenderL ? field.reflectL : field.reflectR,
        lightScreenDefender: isDefenderL ? field.lightScreenL : field.lightScreenR
    };
    
    const result = calculateGen2Damage(attackerData, defenderData, move, fieldForCalc);
    
    // Get Pokemon names from set selector
    const attackerInput = document.querySelector('#p' + (attackerSide === 'L' ? '1' : '2') + ' .set-selector');
    const defenderInput = document.querySelector('#p' + (defenderSide === 'L' ? '1' : '2') + ' .set-selector');
    
    let attackerName = 'Pokemon';
    let defenderName = 'Pokemon';
    
    if (attackerInput && attackerInput.value) {
        const lastHyphen = attackerInput.value.lastIndexOf('-');
        attackerName = attackerInput.value.substring(0, lastHyphen);
    }
    
    if (defenderInput && defenderInput.value) {
        const lastHyphen = defenderInput.value.lastIndexOf('-');
        defenderName = defenderInput.value.substring(0, lastHyphen);
    }
    
    // Get Stat Exp status
    const statExpRadios = document.querySelectorAll('input[name="statExp"]');
    let statExpText = 'No Stat Exp';
    statExpRadios.forEach(function(radio) {
        if (radio.checked) {
            statExpText = radio.value === '65535' ? 'Max Stat Exp' : 'No Stat Exp';
        }
    });
    
    // Get DV info
    const attackerDVTier = document.querySelector('#p' + (attackerSide === 'L' ? '1' : '2') + ' .dvsoverride').value;
    const defenderDVTier = document.querySelector('#p' + (defenderSide === 'L' ? '1' : '2') + ' .dvsoverride').value;
    
    // Calculate multi-turn KO
    const koResult = calculateMultiTurnKO(attackerData, defenderData, move, fieldForCalc);
    
    // Build description
    let description = attackerName + ' ' + move.name + ' (' + statExpText + ', ' + attackerDVTier + ' DVs) vs. ' + 
                      defenderName + ' (' + statExpText + ', ' + defenderDVTier + ' DVs): ';
    
    if (result.max === 0) {
        description += '0-0 (0 - 0%) -- does no damage';
    } else {
        description += result.min + '-' + result.max + ' (' + result.minPercent + '% - ' + result.maxPercent + '%) -- ' + koResult.koText;
    }
    
    // Add "See details" button if there are multi-turn details
    if (koResult.details && koResult.details.length > 0 && result.max > 0) {
        description += ' <button id="toggleDetails" style="margin-left: 10px;">See details</button>';
    }
    
    // Display main result
    document.getElementById('mainResult').innerHTML = description;
    
    // Add event listener for toggle button
    const toggleBtn = document.getElementById('toggleDetails');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            const detailsDiv = document.getElementById('koDetails');
            if (detailsDiv) {
                detailsDiv.style.display = detailsDiv.style.display === 'none' ? 'block' : 'none';
                toggleBtn.textContent = detailsDiv.style.display === 'none' ? 'See details' : 'Hide details';
            }
        });
    }
    
    // Remove existing details if present
    const existingDetails = document.getElementById('koDetails');
    if (existingDetails) {
        existingDetails.remove();
    }
    
    // Build turn details summary
    if (koResult.details && koResult.details.length > 0 && result.max > 0) {
        let detailsHTML = '<div id="koDetails" style="display: none; margin-top: 10px; padding: 10px; background: var(--container-bg); border: 1px solid var(--border-color); border-radius: 4px;">';
        
        // Add starting HP
        detailsHTML += '<div style="margin-bottom: 10px; font-weight: bold;">' + defenderName + ' Starting HP: ' + defenderData.currentHP + '/' + defenderData.stats.hp + '</div>';
        
        koResult.details.forEach((turn, index) => {
            detailsHTML += '<div style="margin: 5px 0;"><strong>Turn ' + turn.turn + ':</strong> ';
            detailsHTML += turn.minDamage + '-' + turn.maxDamage + ' damage from ' + move.name;
            
            // Add end of turn effects description
            if (turn.eotEffects && turn.eotEffects.effects.length > 0) {
                const effectsDesc = turn.eotEffects.effects.map(function(effect) {
                    if (effect.amount > 0) {
                        return effect.amount + ' damage from ' + effect.name;
                    } else {
                        return Math.abs(effect.amount) + ' HP recovered from ' + effect.name;
                    }
                }).join(', ');
                detailsHTML += ', ' + effectsDesc;
            }
            
            // Add total damage at end of turn
            const turnTotalMin = turn.cumulativeMin + (turn.eotEffects.totalDamage > 0 ? turn.eotEffects.totalDamage * (index + 1) : 0);
            const turnTotalMax = turn.cumulativeMax + (turn.eotEffects.totalDamage > 0 ? turn.eotEffects.totalDamage * (index + 1) : 0);
            detailsHTML += '. <strong>Total Damage: ' + turnTotalMin + '-' + turnTotalMax + '</strong>';
            
            detailsHTML += '</div>';
        });
        
        detailsHTML += '<div style="margin-top: 10px; font-weight: bold;">Final Result: ' + koResult.koText + '</div>';
        detailsHTML += '</div>';
        
        // Insert details after main result
        const damageValuesDiv = document.getElementById('damageValues');
        damageValuesDiv.insertAdjacentHTML('beforebegin', detailsHTML);
    }
    
    // Display possible damage amounts (including duplicates)
    if (result.max === 0) {
        document.getElementById('damageValues').textContent = 'Possible damage amounts: (0)';
    } else {
        // Show all rolls including duplicates, sorted
        const sortedRolls = result.rolls.slice().sort((a, b) => a - b);
        document.getElementById('damageValues').textContent = 'Possible damage amounts: (' + sortedRolls.join(', ') + ')';
    }
}

// Get Pokemon data from the UI
function getPokemonData(side) {
    const panelId = side === 'L' ? '#p1' : '#p2';
    const panel = document.querySelector(panelId);
    if (!panel) return null;
    
    // Check if a set is loaded by checking the set selector value
    const setSelector = panel.querySelector('.set-selector');
    if (!setSelector || !setSelector.value) {
        return null;
    }
    
    const level = getCurrentLevel();
    
    // Get stats
    const stats = {
        hp: parseInt(panel.querySelector('tr.hp .total').textContent) || 0,
        atk: parseInt(panel.querySelector('tr.at .total').textContent) || 0,
        def: parseInt(panel.querySelector('tr.df .total').textContent) || 0,
        spa: parseInt(panel.querySelector('tr.sa .total').textContent) || 0,
        spd: parseInt(panel.querySelector('tr.sd .total').textContent) || 0,
        spe: parseInt(panel.querySelector('tr.sp .total').textContent) || 0
    };
    
    // Get boosts
    const boosts = {
        atk: parseInt(panel.querySelector('tr.at .boost').value) || 0,
        def: parseInt(panel.querySelector('tr.df .boost').value) || 0,
        spa: parseInt(panel.querySelector('tr.sa .boost').value) || 0,
        spd: parseInt(panel.querySelector('tr.sd .boost').value) || 0,
        spe: parseInt(panel.querySelector('tr.sp .boost').value) || 0
    };
    
    // Get types
    const type1Elem = document.getElementById('type' + side + '1');
    const type2Elem = document.getElementById('type' + side + '2');
    const types = [type1Elem ? type1Elem.textContent : null, type2Elem ? type2Elem.textContent : null].filter(Boolean);
    
    // Get item
    const itemSelect = document.getElementById('item' + side + '1');
    const item = itemSelect ? itemSelect.value : null;
    
    // Get status
    const statusSelect = document.getElementById('status' + side + '1');
    const status = statusSelect ? statusSelect.value : 'Healthy';
    
    // Get current HP
    const currentHpInput = panel.querySelector('.current-hp');
    const currentHP = currentHpInput ? parseInt(currentHpInput.value) : stats.hp;
    
    // Get Leech Seed status
    const leechSeedCheck = document.getElementById('leechSeed' + side);
    const hasLeechSeed = leechSeedCheck ? leechSeedCheck.checked : false;
    
    return {
        level: level,
        stats: stats,
        boosts: boosts,
        types: types,
        item: item,
        status: status,
        currentHP: currentHP,
        hasLeechSeed: hasLeechSeed
    };
}

// Get move data from the UI
function getMoveData(side, moveNum) {
    const panelId = side === 'L' ? '#p1' : '#p2';
    const panel = document.querySelector(panelId);
    if (!panel) return null;
    
    const moveSelector = panel.querySelectorAll('.move-selector')[moveNum - 1];
    const moveBP = panel.querySelectorAll('.move-bp')[moveNum - 1];
    const moveType = panel.querySelectorAll('.move-type')[moveNum - 1];
    const moveCrit = panel.querySelectorAll('.move-crit')[moveNum - 1];
    
    if (!moveSelector) return null;
    
    const moveName = moveSelector.value;
    if (!moveName) return null;
    
    return {
        name: moveName,
        power: parseInt(moveBP.value) || 0,
        type: moveType ? moveType.value : null,
        isCrit: moveCrit ? moveCrit.checked : false
    };
}

// Get field data
function getFieldData() {
    // Get weather
    let weather = null;
    const weatherRadios = document.querySelectorAll('input[name="gscWeather"]');
    weatherRadios.forEach(function(radio) {
        if (radio.checked && radio.value) {
            weather = radio.value;
        }
    });
    
    // Get field conditions
    const reflectL = document.getElementById('reflectL') ? document.getElementById('reflectL').checked : false;
    const reflectR = document.getElementById('reflectR') ? document.getElementById('reflectR').checked : false;
    const lightScreenL = document.getElementById('lightScreenL') ? document.getElementById('lightScreenL').checked : false;
    const lightScreenR = document.getElementById('lightScreenR') ? document.getElementById('lightScreenR').checked : false;
    const leechSeedL = document.getElementById('leechSeedL') ? document.getElementById('leechSeedL').checked : false;
    const leechSeedR = document.getElementById('leechSeedR') ? document.getElementById('leechSeedR').checked : false;
    
    return {
        weather: weather,
        reflectL: reflectL,
        reflectR: reflectR,
        lightScreenL: lightScreenL,
        lightScreenR: lightScreenR,
        leechSeedL: leechSeedL,
        leechSeedR: leechSeedR
    };
}