import React, { useState, useRef, useEffect } from 'react';
import { Skeleton } from 'antd';

interface LazyImageProps {
  src: string;
  alt?: string;
  placeholder?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * 图片懒加载组件
 * 使用 IntersectionObserver 实现图片懒加载
 * 
 * @example
 * <LazyImage
 *   src="/path/to/image.jpg"
 *   alt="描述"
 *   placeholder={<Skeleton.Image />}
 * />
 */
export function LazyImage({ 
  src, 
  alt = '', 
  placeholder, 
  className = '', 
  style = {},
  onLoad,
  onError,
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // 使用 IntersectionObserver 检测图片是否进入视口
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '50px', // 提前50px开始加载
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
    onError?.();
  };

  return (
    <div className={className} style={style}>
      {/* 加载中占位符 */}
      {!loaded && !error && (placeholder || <Skeleton.Image active />)}
      
      {/* 错误占位符 */}
      {error && (
        <div className="flex items-center justify-center bg-gray-100 text-gray-400">
          加载失败
        </div>
      )}
      
      {/* 实际图片 */}
      {inView && !error && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            display: loaded ? 'block' : 'none',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            ...style,
          }}
        />
      )}
    </div>
  );
}

export default LazyImage;
