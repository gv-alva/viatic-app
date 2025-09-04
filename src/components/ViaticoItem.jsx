import React from 'react';

// CAMBIO: Recibe 'styles' como prop
const ViaticoItem = ({ viatico, styles }) => {
  return (
    // CAMBIO: Aplica las clases desde el objeto 'styles'
    <li className={styles.viaticoItem}>
      <div className={styles.viaticoInfo}>
        <span className={styles.viaticoConcept}>{viatico.concept}</span>
        <span className={styles.viaticoAmount}>${viatico.amount.toFixed(2)}</span>
      </div>
      <div className={styles.viaticoActions}>
        <button className={styles.editButton}>Editar</button>
        <button className={styles.deleteButton}>Eliminar</button>
      </div>
    </li>
  );
};

export default ViaticoItem;