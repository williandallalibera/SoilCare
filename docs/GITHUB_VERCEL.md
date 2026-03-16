# Subir a GitHub y conectar con Vercel

## 1. Crear el repositorio en GitHub

1. Entra en [github.com](https://github.com), inicia sesión y haz clic en **New repository**.
2. Nombre sugerido: `soil-care` (o el que prefieras).
3. Elige **Public**, no marques "Add a README" (ya tienes uno en el proyecto).
4. Clic en **Create repository**.

## 2. Conectar tu carpeta local con GitHub y subir

**Ya hay commits en `main`.** En la terminal, desde la carpeta del proyecto (`Soil Care`), ejecuta (sustituye `TU-USUARIO` por tu usuario de GitHub y `soil-care` por el nombre del repo si lo cambiaste):

```bash
git remote add origin https://github.com/TU-USUARIO/soil-care.git
git push -u origin main
```

Si ya creaste el repo en GitHub vacío (con README o sin él), el primer push puede ser `git push -u origin main`. Si GitHub te sugiere `git pull --rebase origin main` antes, hazlo y luego `git push -u origin main`.

Si GitHub te pide autenticación, usa un **Personal Access Token** (Settings > Developer settings > Personal access tokens) como contraseña, o configura SSH y usa la URL `git@github.com:TU-USUARIO/soil-care.git` en lugar de la URL `https://...`.

## 3. Conectar el repo con Vercel

1. Entra en [vercel.com](https://vercel.com) e inicia sesión (con GitHub si es posible).
2. **Add New** > **Project**.
3. Importa el repositorio **soil-care** (autoriza a Vercel si te lo pide).
4. En **Configure Project**:
   - **Framework Preset:** Vite (debería detectarlo).
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. En **Environment Variables** agrega:
   - `VITE_SUPABASE_URL` → valor de tu proyecto Supabase (Project URL).
   - `VITE_SUPABASE_ANON_KEY` → anon public key de Supabase.
6. **Deploy**. Cuando termine, tendrás una URL tipo `soil-care.vercel.app`.

Cada vez que hagas `git push` a `main`, Vercel volverá a desplegar automáticamente.
