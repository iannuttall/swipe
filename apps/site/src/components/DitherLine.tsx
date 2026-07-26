type DitherLineProps = {
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

const DITHER_PATH =
  'M1 0H0V1V2H1H2H3H4H5H6H7H8H9H10H11H12H13H14H15H16V1H17V2H18V1H19V2H20V1H21V2H22V1H23V2H24V1H25V2H26V1H27V2H28V1H29V2H30V1H31V2H32V1H33V2H34V1H35V2H36V1H37V2H38V1H39V0H38V1H37V0H36V1H35V0H34V1H33V0H32V1H31V0H30V1H29V0H28V1H27V0H26V1H25V0H24V1H23V0H22V1H21V0H20V1H19V0H18V1H17V0H16H15H14H13H12H11H10H9H8H7H6H5H4H3H2H1ZM40 0H41V1H40V0ZM43 0H42V1H43V0ZM45 0H46V1H45V0ZM45 1V2H44V1H45ZM49 0H48V1H49V2H50V1H49V0ZM51 0H52V1H51V0ZM55 0H54V1H55V2H56V1H55V0ZM59 0H60V1H59V0Z'

export function DitherLine({ className, orientation = 'horizontal' }: DitherLineProps) {
  if (orientation === 'vertical') {
    return (
      <svg
        className={className}
        width="4"
        height="60"
        viewBox="0 0 2 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g transform="rotate(90 1 1) translate(0 -1)">
          <path fillRule="evenodd" clipRule="evenodd" d={DITHER_PATH} fill="currentColor" />
        </g>
      </svg>
    )
  }

  return (
    <svg
      className={className}
      width="60"
      height="2"
      viewBox="0 0 60 2"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path fillRule="evenodd" clipRule="evenodd" d={DITHER_PATH} fill="currentColor" />
    </svg>
  )
}
