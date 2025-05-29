/*
 * @version: 1.0.0
 * @Author: Eblis
 * @Date: 2025-05-05 17:13:34
 * @LastEditTime: 2025-05-28 22:19:48
 */
import { Header } from '@/types/blocks/header';
import { Hero } from '@/types/blocks/hero';
import { Section } from '@/types/blocks/section';
import { Footer } from '@/types/blocks/footer';
import { Pricing } from '@/types/blocks/pricing';
import { Train } from '@/types/blocks/train';

export interface LandingPage {
  header?: Header;
  hero?: Hero;
  branding?: Section;
  introduce?: Section;
  benefit?: Section;
  usage?: Section;
  feature?: Section;
  showcase?: Section;
  stats?: Section;
  pricing?: Pricing;
  testimonial?: Section;
  faq?: Section;
  cta?: Section;
  footer?: Footer;
}

export interface TrainPage {
  train?: train;
}

export interface PricingPage {
  pricing?: Pricing;
}

export interface ShowcasePage {
  showcase?: Section;
}
