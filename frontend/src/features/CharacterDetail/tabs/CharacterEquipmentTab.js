// src/features/CharacterDetail/tabs/CharacterEquipmentTab.js
import React from 'react'; // Убрали useState
import EquippedItemDisplay from '../components/EquippedItemDisplay';
import { theme } from '../../../styles/theme';

// Иконки для заголовков секций
const SectionIcon = ({ type }) => {
    const iconStyle = { width: '22px', height: '22px', fill: theme.colors.secondary, marginRight: '10px'};
    switch (type) {
        case 'offense': // Меч
            return <svg style={iconStyle} viewBox="0 0 24 24"><path d="M21.71,5.29l-4-4a1,1,0,0,0-1.42,0l-12,12a1,1,0,0,0,0,1.42l4,4a1,1,0,0,0,1.42,0l12-12A1,1,0,0,0,21.71,5.29ZM11,18.59l-2-2L12.59,13,14,14.41ZM18.59,10,17,11.59l-4-4L14.59,6Zm-4-4L16,7.41,10.41,13,9,11.59Z"/></svg>;
        case 'defense': // Щит
             return <svg style={iconStyle} viewBox="0 0 24 24"><path d="M12,1A10,10,0,0,0,2,11v3.54a1,1,0,0,0,.41.81l7,4.46A1,1,0,0,0,10,20h4a1,1,0,0,0,.59-.19l7-4.46A1,1,0,0,0,22,14.54V11A10,10,0,0,0,12,1Zm0,17.74L5.88,15.51,5,15.17V11a7,7,0,0,1,14,0v4.17l-.88.34Z"/></svg>;
        default: return null;
    }
};

// --- Основной Компонент Вкладки ---
const CharacterEquipmentTab = ({ character, handleUnequip, apiActionError }) => {

    if (!character) {
        // Можно вернуть плейсхолдер или сообщение об ошибке
        return <div style={styles.placeholderText}>Нет данных о персонаже для отображения экипировки.</div>;
    }

    // --- Логика определения занятости слотов ---
    const weapon1 = character.equipped_weapon1;
    const weapon2 = character.equipped_weapon2;
    const shield = character.equipped_shield;
    const armor = character.equipped_armor;

    // Проверка на двуручное оружие
    const isW1TwoHanded = weapon1?.item?.item_type === 'weapon' && weapon1.item.is_two_handed === true;
    // Доступность слотов
    const isW2SlotAvailable = !isW1TwoHanded && !shield;
    const isShieldSlotAvailable = !isW1TwoHanded && !weapon2; // Щит нельзя с двуручным или со вторым оружием

    // Обработка ошибок (без изменений)
    const relevantError = typeof apiActionError === 'string' && apiActionError && (apiActionError.includes('экипиров') || apiActionError.includes('снятия')) ? (
         <p style={styles.apiActionErrorStyle}>{apiActionError}</p>
     ) : null;

    // --- Рендеринг ---
    return (
        <div style={styles.tabContent}>
            {/* <h4 style={styles.tabHeaderNoBorder}>Экипировка</h4> // Убрали заголовок для лаконичности */}
            {relevantError}

            {/* Основной Grid-контейнер для секций */}
            <div style={styles.equipmentLayoutGrid}>

                                {/* === Секция Защиты === */}
                <section style={{...styles.section, ...styles.defenseSection}}>

                     <div style={styles.itemContainer}> {/* Броня */}
                         <span style={styles.slotLabel}>Броня:</span>
                         <EquippedItemDisplay itemData={armor} character={character} onUnequip={handleUnequip} slotKey="armor"/>
                     </div>
                     {/* Можно добавить другие слоты защиты */}
                </section>

                {/* === Секция Вооружения === */}
                <section style={{...styles.section, ...styles.offenseSection}}>
                    {/* Контейнер для основного и доп. оружия/щита */}
                    <div style={styles.offenseLayout}>
                         {/* Основное оружие (W1) */}
                         <div style={styles.itemContainer}>
                            <span style={styles.slotLabel}>Основное оружие:</span>
                            <EquippedItemDisplay
                                itemData={weapon1}
                                character={character}
                                onUnequip={handleUnequip}
                                slotKey="weapon1"
                            />
                         </div>

                         {/* Контейнер для Доп. оружия / Щита */}
                         <div style={styles.offhandContainer}>
                             {/* Доп. оружие */}
                             {isW2SlotAvailable && (
                                <div style={styles.itemContainerSmall}>
                                    <span style={styles.slotLabel}>Доп. оружие:</span>
                                    <EquippedItemDisplay itemData={weapon2} character={character} onUnequip={handleUnequip} slotKey="weapon2"/>
                                </div>
                              )}
                             {/* Щит */}
                             {isShieldSlotAvailable && (
                                <div style={styles.itemContainerSmall}>
                                     <span style={styles.slotLabel}>Щит:</span>
                                     <EquippedItemDisplay itemData={shield} character={character} onUnequip={handleUnequip} slotKey="shield"/>
                                </div>
                              )}

                             {/* Заглушки */}
                             {isW1TwoHanded && ( <div style={{...styles.itemContainerSmall, opacity: 0.6}}><span style={styles.slotLabel}>Доп. / Щит:</span><div style={styles.disabledSlotText}>(Слот недоступен)</div></div> )}
                             {!isW1TwoHanded && weapon2 && !isShieldSlotAvailable && ( <div style={{...styles.itemContainerSmall, opacity: 0.6}}><span style={styles.slotLabel}>Щит:</span><div style={styles.disabledSlotText}>(Слот недоступен)</div></div> )}
                         </div>
                    </div>
                </section>

            </div>
        </div>
    );
};

// --- Стили ---
const styles = {
    tabContent: { animation: 'fadeIn 0.5s ease-out' },
    equipmentLayoutGrid: { display: 'grid', gap: '25px', '@media (max-width: 900px)': { gridTemplateColumns: '1fr' } },
    section: { background: `${theme.colors.surface}44`, borderRadius: '12px', padding: '20px', border: `1px solid ${theme.colors.surface}99`, display: 'flex', flexDirection: 'column', gap: '15px' },
    offenseSection: { /* Специфичные стили, если нужны */ },
    defenseSection: { /* Специфичные стили, если нужны */ },
    sectionTitle: { margin: '0 0 10px 0', color: theme.colors.secondary, fontSize: '1.05rem', display: 'flex', alignItems: 'center', paddingBottom: '10px', borderBottom: `1px dashed ${theme.colors.surface}aa`, textTransform: 'uppercase', letterSpacing: '0.5px' },
    offenseLayout: { display: 'flex', gap: '20px', flexWrap: 'wrap' },
    itemContainer: { flex: '1 1 100%', minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '8px' },
    itemContainerSmall: { display: 'flex', flexDirection: 'column', gap: '5px' },
    offhandContainer: { flex: '1 1 100%', minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px', paddingTop: '15px', borderTop: `1px solid ${theme.colors.surface}55` },
    slotLabel: { fontWeight: 'bold', color: theme.colors.textSecondary, fontSize: '0.8rem', marginLeft: '5px', textTransform: 'uppercase', opacity: 0.8 },
    disabledSlotText: { fontStyle: 'italic', color: theme.colors.textSecondary, fontSize: '0.9rem', textAlign: 'center', padding: '20px 10px', border: `1px dashed ${theme.colors.surface}88`, borderRadius: '10px', background: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100px', boxSizing: 'border-box' },
    placeholderText: { color: theme.colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: '30px' },
    apiActionErrorStyle: { background: `${theme.colors.error}22`, color: theme.colors.error, padding: '8px 12px', borderRadius: '6px', border: `1px solid ${theme.colors.error}55`, textAlign: 'center', marginBottom: '15px', fontSize: '0.9rem' },
};

export default CharacterEquipmentTab;