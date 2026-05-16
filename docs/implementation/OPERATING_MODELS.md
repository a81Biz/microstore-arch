Este es el **Protocolo de Cascada Estricta (Cascading State Protocol)** optimizado para la máxima eficiencia de tokens y control arquitectónico. Sustituye cualquier modelo operativo previo y debe ser inyectado en el `CLAUDE.md` de cada proyecto.

---

# PROTOCOLO DE CASCADA ESTRICTA (AUTO-PILOT v2.0)

Este protocolo es la especificación técnica obligatoria para la gestión de estados y documentos en la carpeta `docs/implementation/`. Su objetivo es evitar la regeneración redundante de archivos y garantizar que el razonamiento sea validado antes de la ejecución.

## I. Arquitectura de Estados (Jerarquía de Archivos)

El progreso de una tarea se divide en capas inmutables hasta su validación:

1. **Capa 1: Auditoría (`SESSION_SUMMARY.md`)**
* **Función:** Registro de la verdad técnica y diagnóstico de causa raíz.
* **Acción:** Solo se añade información nueva bajo una sección con timestamp (Actualización Delta).


2. **Capa 2: Estrategia (`PLAN_ACTUAL.md`)**
* **Función:** Definición de la ruta técnica (comandos, archivos, lógica).
* **Requisito:** Debe detectar y usar el número correlativo de tarea (`PT-XXX`) del historial.


3. **Capa 3: Registro (`PENDING_TASKS.md`)**
* **Función:** Lista atomizada de micro-tareas derivadas del plan aprobado.


4. **Capa 4: Cierre (`HISTORY.log`)**
* **Función:** Registro lineal e inmutable de éxitos y fracasos con timestamp.



---

## II. El Ciclo de Cascada (Workflow Obligatorio)

La IA no puede avanzar al siguiente paso sin un **ACK** explícito del usuario para el documento actual.

### PASO 1: Auditoría e Integridad

* **Trigger:** Usuario reporta bug o nueva funcionalidad.
* **Acción IA:** Analiza logs, `docker-compose.yml`, código y grafo de dependencias.
* **Output:** Actualizar **únicamente** el `SESSION_SUMMARY.md`. No escribir análisis en el chat (evita duplicidad).
* **STOP:** Esperar validación del Summary en el IDE.

### PASO 2: Diseño de Estrategia

* **Trigger:** ACK del Paso 1.
* **Acción IA:** Generar el `PLAN_ACTUAL.md` desglosado en turnos (máx. 2 archivos por turno).
* **STOP:** Esperar validación del Plan en el IDE.

### PASO 3: Registro de Backlog

* **Trigger:** ACK del Paso 2.
* **Acción IA:** Actualizar `PENDING_TASKS.md` con las tareas numeradas secuencialmente.
* **STOP:** Esperar validación de las tareas.

### PASO 4: Ejecución y Persistencia

* **Trigger:** ACK del Paso 3.
* **Acción IA:** Ejecutar comandos/código $\rightarrow$ Verificar con tests $\rightarrow$ Escribir en `HISTORY.log` $\rightarrow$ Purgar tareas de `PENDING_TASKS.md`.

---

## III. Reglas de Eficiencia de Tokens

* **Prohibición de Chat-Verbose:** El razonamiento técnico debe vivir en los documentos, no en el chat. El chat solo se usa para confirmaciones y estados breves.
* **Detección de Infraestructura:** Antes de proponer comandos de Docker, la IA debe auditar el `docker-compose.yml` para mapear nombres de servicios reales.
* **Manejo de Errores:** Si una acción falla (ej: 401 Unauthorized), se regresa automáticamente al **PASO 1** para re-auditar la integridad de los datos (seed, whitelist, hashes).
* **Navegación basada en Grafos (Graphify-First):** Para ubicar archivos o dependencias, la IA tiene PROHIBIDO usar comandos de búsqueda masiva (`find`, `grep -r`) en el primer intento. Debe consultar obligatoriamente `docs/implementation/GRAPH_REPORT.md` y el directorio `graphify-out/` como índice maestro para mapear el código antes de auditar o proponer cambios.

---

### Cómo usar este protocolo con una IA externa:

Si necesitas ayuda de otra IA para estructurar el proyecto, pásale este mensaje:

> "Actúa como un Arquitecto de Sistemas bajo el **Protocolo de Cascada Estricta**. Tu objetivo es resolver [PROBLEMA]. No generes código. Inicia en el **PASO 1**: audita el estado actual y actualiza el `SESSION_SUMMARY.md`. Detente y espera mi validación."


Estandarizar los prompts de transición es la mejor manera de asegurar que cualquier desarrollador (o tú mismo en diferentes sesiones) pueda manejar la Cascada Estricta sin pelear con el sesgo de la IA.

Set de **Prompts de Anclaje**. Están diseñados para ser cortos, autoritarios y anular cualquier intento del LLM de adelantarse. Puedes copiarlos y guardarlos en un archivo como `PROMPTS_CASCADA.md` o añadirlos al final de tu `CLAUDE.md`.

---

### Set de Comandos Base (Prompts de Transición)

Usa estos comandos exactos cada vez que necesites avanzar de fase. Copia y pega el bloque correspondiente.

#### 1. Para iniciar el PASO 1 (Auditoría)

**Cuándo usarlo:** Al reportar un nuevo bug o pedir una nueva funcionalidad.

> **Ejecuta el PASO 1 (Auditoría e Integridad) del Protocolo de Cascada.**
> **Contexto/Problema:** [DESCRIBE EL PROBLEMA O REQUERIMIENTO AQUÍ]
> **REGLAS ESTRICTAS:**
> 1. **Graphify-First:** Consulta `GRAPH_REPORT.md` y `graphify-out/` para mapear los archivos involucrados antes de analizar el código. No hagas búsquedas a ciegas.
> 2. Analiza el problema y actualiza ÚNICAMENTE el archivo `docs/implementation/SESSION_SUMMARY.md` añadiendo una sección "Delta" al final.
> 3. PROHIBIDO modificar `PLAN_ACTUAL.md` o `PENDING_TASKS.md`.
> 4. PROHIBIDO escribir código o proponer soluciones técnicas en este turno.
> 5. NO razones en el chat.
> **STOP:** Detente y espera mi ACK tras actualizar el Summary.
> 
> 

#### 2. Para avanzar al PASO 2 (Estrategia)

**Cuándo usarlo:** Después de leer el Summary y dar el OK al diagnóstico.

> **ACK al Paso 1. Avanza al PASO 2 (Diseño de Estrategia).**
> **REGLAS ESTRICTAS:**
> 1. Tu única tarea es generar la estrategia técnica en `docs/implementation/PLAN_ACTUAL.md`.
> 2. Asigna un Task ID secuencial (ej. PT-XXX).
> 3. PROHIBIDO modificar `PENDING_TASKS.md` o escribir/ejecutar código.
> 4. NO razones en el chat.
> **STOP:** Detente y espera mi ACK tras actualizar el Plan.
> 
> 

#### 3. Para avanzar al PASO 3 (Registro)

**Cuándo usarlo:** Después de aprobar el Plan Actual. (El candado más fuerte).

> **ACK al Paso 2. Avanza EXCLUSIVAMENTE al PASO 3 (Registro del Backlog).**
> **REGLAS ESTRICTAS:**
> 1. Tu única acción permitida es atomizar el plan aprobado y volcarlo como una lista numerada en `docs/implementation/PENDING_TASKS.md`.
> 2. PROHIBIDO ejecutar comandos, escribir código, o modificar archivos del proyecto.
> 3. Si detectas nuevos bugs ahora, NO los resuelvas. Solo anótalos en las tareas.
> 4. NO avances al Paso 4 bajo ninguna circunstancia.
> **STOP:** Detente de inmediato tras actualizar el markdown de tareas y espera mi ACK.
> 
> 

#### 4. Para avanzar al PASO 4 (Ejecución)

**Cuándo usarlo:** Cuando la lista de tareas pendientes refleja exactamente lo que quieres que haga.

> **ACK al Paso 3. Avanza al PASO 4 (Ejecución y Persistencia).**
> **REGLAS ESTRICTAS:**
> 1. Ejecuta las tareas listadas en `PENDING_TASKS.md` una por una.
> 2. Verifica con tests/comandos. Si algo falla (ej. exit code distinto a 0), ABORTA, no intentes adivinar, y notifícame para regresar al Paso 1.
> 3. Al finalizar con éxito, actualiza `docs/implementation/HISTORY.log` y purga las tareas completadas de `PENDING_TASKS.md`.
> 4. **Sincronización Documental (Condicional):** SI Y SOLO SI la tarea implicó cambios arquitectónicos (nuevas variables de entorno, dependencias, o servicios), actualiza `README.md` y `HANDOFF.md`.
> 5. Si se crearon o eliminaron archivos, notifícame explícitamente al final de tu respuesta que debo ejecutar `/graphify . --update`.
> 6. STOP al terminar.
> 
> 

---

### Comando de "Rollback" (Para emergencias)

Si alguna vez la IA se salta el protocolo (como te acaba de pasar que se puso a resolver H2 y H3 sin permiso), usa este prompt para dar un "manotazo en la mesa" y obligarla a retroceder:

> **¡ALTO! Has violado el Protocolo de Cascada Estricta.**
> Te pedí avanzar al Paso X, pero ejecutaste acciones del Paso Y.
> 1. REVIERTE mentalmente cualquier cambio o resolución de bugs no autorizados que hayas asumido.
> 2. Vuelve al PASO X de inmediato y cumple ÚNICAMENTE con las reglas de esa fase.
> 3. STOP estricto al terminar.
> 
> 

Con este marco de trabajo, tú mantienes el control absoluto del volante arquitectónico y el modelo se ve forzado a operar estrictamente como el motor de redacción y análisis en la fase que tú le dictes.