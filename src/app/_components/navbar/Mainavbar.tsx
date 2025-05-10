import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export function Mainavbar() {
    return (
        <nav className="navbar navbar-expand-lg bg-body-tertiary">
                    <div className="container-fluid">
                        <a className="navbar-brand" href="#">
                            <Image src="/logo_fondo_blanco.jpg" alt="Logo SUDEA" width={120} height={80} priority />
                        </a>
                        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNavDropdown" aria-controls="navbarNavDropdown" aria-expanded="false" aria-label="Toggle navigation">
                            <span className="navbar-toggler-icon"></span>
                        </button>
                        <div className="collapse navbar-collapse" id="navbarNavDropdown">
                            <ul className="navbar-nav">
                                <ul className="navbar-nav">
  <li className="nav-item">
    <Link href="/principal/dashboard/Subir-Registro" className="nav-link">
      Subir Imágenes
    </Link>
  </li>
  <li className="nav-item">
    <Link href="/principal/dashboard/Ver-Galeria" className="nav-link">
      Ver Galería
    </Link>
  </li>
  <li className="nav-item">
    <Link href="/principal/dashboard/Perfil" className="nav-link">
      Mi perfil
    </Link>
  </li>
</ul>
                            </ul>
                            <ul className="navbar-nav ms-auto">
                                <li className="nav-item dropdown">
                                    <a className="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                                      <div>
                                        Perfil 
                                      </div>
                                    </a>
                                    <ul className="dropdown-menu dropdown-menu-end">
                                        <li><a className="dropdown-item" href="#">Cerrar Sesión</a></li>
                                    </ul>
                                </li>
                            </ul>
                        </div>
                    </div>
                  </nav>
    );
}