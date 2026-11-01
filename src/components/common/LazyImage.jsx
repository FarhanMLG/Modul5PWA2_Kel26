import { useState } from 'react'

/**
 * LazyImage — High-performance lazy-loading image component.
 * Features:
 * - Native loading="lazy"
 * - Shimmer / skeleton placeholder during fetch
 * - Fallback placeholder on network error
 * - Smooth opacity transition on load
 */
export default function LazyImage({
  src,
  alt,
  className = '',
  width,
  height,
  fallback = '/guns/pistol.svg',
  style = {},
  ...props
}) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  const finalSrc = error || !src ? fallback : src

  return (
    <div
      className={`lazy-img-container ${!loaded ? 'lazy-img--loading' : ''} ${className}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: width ? `${width}px` : undefined,
        height: height ? `${height}px` : undefined,
        ...style,
      }}
    >
      {!loaded && !error && (
        <div className="lazy-img-skeleton" aria-hidden="true" />
      )}
      <img
        src={finalSrc}
        alt={alt || 'Product image'}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          setError(true)
          setLoaded(true)
        }}
        className={`lazy-img ${loaded ? 'lazy-img--loaded' : ''}`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transition: 'opacity 0.25s ease-in-out',
          opacity: loaded ? 1 : 0,
        }}
        {...props}
      />
    </div>
  )
}
