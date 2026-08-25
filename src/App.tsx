/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { NeonGame } from './components/NeonGame';

export default function App() {
  return (
    <main className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
      <NeonGame />
    </main>
  );
}

