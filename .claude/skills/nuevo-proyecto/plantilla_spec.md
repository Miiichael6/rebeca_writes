# Proyecto: nombre de trabajo — qué es en una línea

> Resumen en 2–3 frases: qué hace, para quién y qué lo diferencia (p. ej. "100 % local", "sin cuenta").

**Nombre:** `APP_NAME` = "Nombre" (una sola constante en el código; no se hardcodea en ningún otro sitio)
**Referencias:** [capturas](images/) · apps parecidas (qué se toma de ellas y qué **no**: marca, nombre, logo)

## 1. Stack técnico
- Lenguaje / runtime:
- Framework:
- Librerías clave (y por qué cada una):
- Herramientas: lint, format, tests, build/empaquetado
- Restricciones: (sin módulos nativos, offline, versión mínima de SO…)

## 2. Funcionalidad principal
### 2.1 Nombre del bloque
- Qué hace, entradas → salidas, casos borde.
- Comandos, formatos o protocolos exactos si se conocen. Si no: `[[VERIFICAR: …]]`.

### 2.2 Otro bloque
- …

## 3. Formatos / datos de entrada y salida
- Qué se acepta, qué se exporta, límites (tamaño, duración, codificación).

## 4. Interfaz
### 4.1 Pantalla principal
- Zonas, componentes, estados (vacío, cargando, error), atajos de teclado.
### 4.2 Otra pantalla
- …

## 5. Datos y persistencia
- Dónde se guarda, en qué formato y cómo (p. ej. escritura atómica).
- Qué no se borra nunca (archivos del usuario).

## 6. Calidad y detalles
- Errores y mensajes, logs, i18n, accesibilidad, rendimiento (p. ej. listas virtualizadas), seguridad.

## 7. Estructura sugerida
```
src/
  …
```

## 8. Fases de trabajo
1. **Base**: el proyecto arranca vacío con lint, format y tests.
2. **…**
N. **Build / cierre**: instalador o despliegue y criterios de aceptación.

## 9. Fuera de alcance (v1)
- Lo que explícitamente **no** se hace ahora, para que ninguna tarea lo incluya.

## 10. Criterios de aceptación
- [ ] Resultado observable 1 (se puede comprobar a mano)
- [ ] Resultado observable 2
