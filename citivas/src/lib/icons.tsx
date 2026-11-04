import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import AntDesign from '@expo/vector-icons/AntDesign';

interface IconProps {
  size?: number;
  color?: string;
  fill?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}

type IconComp = React.FC<IconProps>;

const makeIon = (name: string): IconComp =>
  ({ size = 24, color = 'black', fill, style }: IconProps) =>
    React.createElement(Ionicons, { name: name as any, size, color, fill, style } as any);

const makeFeather = (name: string): IconComp =>
  ({ size = 24, color = 'black', fill, style }: IconProps) =>
    React.createElement(Feather, { name: name as any, size, color, fill, style } as any);

const makeMaterial = (name: string): IconComp =>
  ({ size = 24, color = 'black', fill, style }: IconProps) =>
    React.createElement(MaterialIcons, { name: name as any, size, color, fill, style } as any);

const makeMaterialCommunity = (name: string): IconComp =>
  ({ size = 24, color = 'black', fill, style }: IconProps) =>
    React.createElement(MaterialCommunityIcons, { name: name as any, size, color, fill, style } as any);

const makeFA = (name: string): IconComp =>
  ({ size = 24, color = 'black', fill, style }: IconProps) =>
    React.createElement(FontAwesome, { name: name as any, size, color, fill, style } as any);

const makeFA5 = (name: string): IconComp =>
  ({ size = 24, color = 'black', fill, style }: IconProps) =>
    React.createElement(FontAwesome5, { name: name as any, size, color, fill, style } as any);

const makeAnt = (name: string): IconComp =>
  ({ size = 24, color = 'black', fill, style }: IconProps) =>
    React.createElement(AntDesign, { name: name as any, size, color, fill, style } as any);

export const ArrowLeft: IconComp = makeIon('chevron-back');
export const ChevronLeft: IconComp = makeIon('chevron-back');
export const ChevronRight: IconComp = makeIon('chevron-forward');
export const ArrowRight: IconComp = makeIon('arrow-forward');
export const Users: IconComp = makeIon('people');
export const CheckCircle2: IconComp = makeIon('checkmark-circle');
export const CheckCircle: IconComp = makeIon('checkmark-circle');
export const Compass: IconComp = makeIon('compass');
export const Building2: IconComp = makeMaterial('apartment');
export const Calendar: IconComp = makeIon('calendar');
export const CalendarDays: IconComp = makeIon('calendar');
export const ShoppingBag: IconComp = makeIon('bag');
export const ShoppingCart: IconComp = makeIon('cart');
export const LayoutDashboard: IconComp = makeMaterial('dashboard');
export const Bookmark: IconComp = makeIon('bookmark');
export const Wallet: IconComp = makeIon('wallet');
export const MessageCircle: IconComp = makeFeather('message-circle');
export const MessageSquare: IconComp = makeFeather('message-square');
export const Share2: IconComp = makeFeather('share-2');
export const Settings: IconComp = makeIon('settings');
export const Headphones: IconComp = makeIon('headset');
export const Hotel: IconComp = makeMaterial('hotel');
export const UtensilsCrossed: IconComp = makeMaterialCommunity('silverware-fork-knife');
export const MapPin: IconComp = makeFeather('map-pin');
export const Heart: IconComp = makeFeather('heart');
export const Smile: IconComp = makeIon('happy');
export const Search: IconComp = makeFeather('search');
export const Menu: IconComp = makeFeather('menu');
export const User: IconComp = makeFeather('user');
export const Star: IconComp = makeFeather('star');
export const Ticket: IconComp = makeIon('ticket');
export const Store: IconComp = makeMaterial('store');
export const Home: IconComp = makeFeather('home');
export const X: IconComp = makeFeather('x');
export const Loader2: IconComp = makeFeather('loader');
export const Plus: IconComp = makeFeather('plus');
export const Camera: IconComp = makeFeather('camera');
export const Trash2: IconComp = makeFeather('trash-2');
export const Send: IconComp = makeFeather('send');
export const Mail: IconComp = makeFeather('mail');
export const Lock: IconComp = makeFeather('lock');
export const Eye: IconComp = makeFeather('eye');
export const EyeOff: IconComp = makeFeather('eye-off');
export const Sun: IconComp = makeFeather('sun');
export const Moon: IconComp = makeFeather('moon');
export const LogOut: IconComp = makeFeather('log-out');
export const Shield: IconComp = makeFeather('shield');
export const HelpCircle: IconComp = makeFeather('help-circle');
export const CreditCard: IconComp = makeFeather('credit-card');
export const Bell: IconComp = makeFeather('bell');
export const ArrowDown: IconComp = makeFeather('arrow-down');
export const ArrowUp: IconComp = makeFeather('arrow-up');
export const Minus: IconComp = makeFeather('minus');
export const Package: IconComp = makeFeather('package');
export const Phone: IconComp = makeFeather('phone');
export const Clock: IconComp = makeFeather('clock');
export const Sparkles: IconComp = makeMaterialCommunity('sparkles');
export const Share: IconComp = makeFeather('share');
export const ShieldCheck: IconComp = makeFeather('shield-check');
export const Check: IconComp = makeFeather('check');
export const Truck: IconComp = makeFeather('truck');
export const RefreshCcw: IconComp = makeFeather('refresh-ccw');
export const Edit3 = CreditCard;

export default {
  ArrowLeft, ChevronLeft, ChevronRight, ArrowRight, Users,
  CheckCircle2, CheckCircle, Compass, Building2, Calendar, CalendarDays,
  ShoppingBag, ShoppingCart, LayoutDashboard, Bookmark, Wallet,
  MessageCircle, MessageSquare, Share2, Settings, Headphones,
  Hotel, UtensilsCrossed, MapPin, Heart, Smile, Search, Menu, User,
  Star, Ticket, Store, Home, X, Loader2, Plus, Camera, Trash2,
  Send, Mail, Lock, Eye, EyeOff, Sun, Moon, LogOut, Shield,
  HelpCircle, CreditCard, Bell, ArrowDown, ArrowUp, Minus, Package, Edit3,
  Phone, Clock, Sparkles, Share, ShieldCheck, Check, Truck, RefreshCcw,
};
