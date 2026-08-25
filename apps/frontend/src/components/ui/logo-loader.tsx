import Image from "next/image";

export type LogoLoaderProps = {
  size?: number;
};

const LogoLoader: React.FC<LogoLoaderProps> = ({ size = 16 }) => {
  return (
    <Image
      src="/jslab-logo.svg"
      alt=""
      aria-hidden="true"
      width={99}
      height={100}
      unoptimized
      style={{ display: "block", width: "auto", height: size }}
    />
  );
};

export default LogoLoader;
