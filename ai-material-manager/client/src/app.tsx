import React, { Suspense, lazy, useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import RootRedirect from './components/RootRedirect';
import PageFallback from './components/PageFallback';
import NotFound from './pages/NotFound/NotFound';
import { pageLoaders, preloadPage, type PageName } from './lib/page-loaders';

const InboxPage = lazy(pageLoaders.inbox);
const LibraryPage = lazy(pageLoaders.library);
const MaterialDetailPage = lazy(pageLoaders.material);
const MinePage = lazy(pageLoaders.mine);
const MorePage = lazy(pageLoaders.more);
const UploadPage = lazy(pageLoaders.upload);

function usePreloadPagesWhenIdle(): void {
  useEffect(() => {
    const run = (): void => {
      (['library', 'material', 'inbox', 'mine', 'more'] as PageName[]).forEach(preloadPage);
    };
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(run, 2500);
    return () => window.clearTimeout(timer);
  }, []);
}

const page = (element: React.ReactNode): React.ReactNode => (
  <Suspense fallback={<PageFallback />}>{element}</Suspense>
);

const RoutesComponent = () => {
  usePreloadPagesWhenIdle();
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<RootRedirect />} />
        <Route path="inbox" element={page(<InboxPage />)} />
        <Route path="library" element={page(<LibraryPage />)} />
        <Route path="material/:baseRecordId" element={page(<MaterialDetailPage />)} />
        <Route path="mine" element={page(<MinePage />)} />
        <Route path="more" element={page(<MorePage />)} />
        <Route path="upload" element={page(<UploadPage />)} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;
