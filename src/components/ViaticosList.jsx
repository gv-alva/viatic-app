import React from 'react';
import ViaticoItem from './ViaticoItem';

// CAMBIO: Recibe 'styles' como prop
const ViaticosList = ({ viaticos, styles }) => {
  if (viaticos.length === 0) {
    return <p>No hay viáticos registrados para esta semana.</p>;
  }

  return (
    // CAMBIO: Aplica la clase desde el objeto 'styles'
    <ul className={styles.viaticosList}>
      {viaticos.map((viatico) => (
        // CAMBIO: Pasa 'styles' al siguiente componente
        <ViaticoItem key={viatico.id} viatico={viatico} styles={styles} />
      ))}
    </ul>
  );
};

export default ViaticosList;