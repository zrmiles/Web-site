import React from 'react';
import Header from './Header';
import Footer from './Footer';
import ToastContainer from './ToastContainer';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="main">{children}</main>
      <Footer />
      <ToastContainer />
    </>
  );
}
