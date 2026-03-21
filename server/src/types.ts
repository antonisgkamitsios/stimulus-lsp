export type ControllerPath = string;
export type ControllerIdentifier = string;
export interface Location {
  start: {
    character: number;
    line: number;
  };
  end: {
    character: number;
    line: number;
  };
}

interface WithName {
  name: string;
}
interface WithLocation {
  loc?: Location;
}

export interface WithNameAndLocation extends WithName, WithLocation {}

export type Method = WithNameAndLocation;
export type Target = WithNameAndLocation;
export type Class = WithNameAndLocation;
export type Value = WithNameAndLocation;
export type Outlet = WithNameAndLocation;

export interface ControllerInfo {
  identifier: string;
  fullPath: string;
  relativePath: string;
  methods: Method[];
  values: Value[];
  targets: Target[];
  classes: Class[];
  outlets: Outlet[];
}
