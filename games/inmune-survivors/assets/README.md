# Assets de Inmune Survivors

Todas las imágenes del juego son **WebP** en su resolución original:
- **Sprites** (microbios, jefes, focos, esporas, fagocitosis): 512 px, o 256 px los cuadros de fagocitosis.
  Van con calidad 90 y el canal alfa al 100 %, porque de ese canal salen las siluetas de contorno.
- **Tejidos de fondo**: 1254 px. Van con calidad 95, porque el juego los agranda ×1,77 y los degradados oscuros
  muestran bloques con menos calidad.

En v3.5 se pasó de ~15,6 MB en PNG a ~2,5 MB. Se compararon recortes al 200 % y a la escala del juego y no hay
diferencias visibles. Los PNG originales siguen en el historial de git (commit anterior a v3.5).

## Agregar o regenerar una imagen

Partí siempre del PNG fuente (sin pérdida) y convertí una sola vez; no reconviertas un WebP.

```bash
python -c "from PIL import Image; Image.open('nuevo.png').save('nuevo.webp', 'WEBP', quality=90, alpha_quality=100, method=6)"
```

Para un tejido de fondo, usá `quality=95` (sin alfa). Después sumá la clave en `preload()` de `game.js`.
