# 🗳️ Sistema Web de Votación


![Python](https://img.shields.io/badge/Python-3.13-blue)
![Flask](https://img.shields.io/badge/Flask-Web%20App-black)
![Tests](https://img.shields.io/badge/tests-4%20passed-brightgreen)


Aplicación web desarrollada con **Python y Flask** para gestionar procesos de votación, usuarios, candidatos y resultados.

El proyecto ha evolucionado durante las prácticas de **Estándares y Métricas de Calidad de Software**, incorporando validaciones, pruebas automatizadas y mejoras orientadas a la calidad del software.

## 🚀 Tecnologías

- Python
- Flask
- Flask-SQLAlchemy
- PostgreSQL
- SQLite para pruebas
- Pytest

## ✨ Funcionalidades

- Registro de usuarios
- Inicio de sesión
- Gestión de elecciones
- Registro de candidatos
- Emisión de votos
- Prevención de voto duplicado
- Consulta de resultados
- Control de acceso
- Cierre de sesión

## 📁 Estructura del proyecto

```text
guia4-sistema-votacion/
├── docs/
│   └── GUIA4_NOTAS_CALIDAD.md
├── tests/
│   └── test_app.py
├── .gitignore
├── app.py
├── config.py
├── models.py
├── requirements.txt
├── schema.sql
└── seed.sql

## 🔄 Gestión de configuración y control de cambios

Este proyecto utiliza Git y GitHub para controlar las versiones del código fuente y mantener trazabilidad sobre los cambios realizados.

Las modificaciones se desarrollan mediante ramas independientes y se integran a la rama principal mediante Pull Requests, permitiendo revisar los cambios antes de incorporarlos al proyecto.

### Flujo de cambios 

Para incorporar mejoras al proyecto se utiliza el siguiente flujo:

1. Crear una rama independiente a partir de `main`.
2. Realizar y documentar los cambios.
3. Crear un commit descriptivo.
4. Publicar la rama en GitHub.
5. Crear un Pull Request.
6. Revisar los cambios antes de integrarlos a `main`.