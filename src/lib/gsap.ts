import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register plugins once; import gsap from here, not from "gsap" directly.
gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };
