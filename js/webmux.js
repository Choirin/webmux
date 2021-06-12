const rowCount = 40;
const colCount = 40;
const minimumSize = [3, 2];

const Axis = Object.freeze({
  'horizontal': 0,
  'vertical': 1
});

reverseAxis = function(axis) {
  return axis === Axis.horizontal? Axis.vertical: Axis.horizontal;
}

class Container {
  constructor(parent, size, splitAxis) {
    this.parent = parent;
    this.size = size;
    this.splitAxis = splitAxis;
    this.children = [];
  }

  changeParent(parent) {
    this.parent = parent;
  }

  appendChild(child) {
    this.children.push(child);
  }

  indexOf(child) {
    return this.children.indexOf(child);
  }

  insertChild(child, position) {
    this.children.splice(position, 0, child);
  }

  removeChild(child) {
    let index = this.children.indexOf(child);
    if (this.children.length > 1 && this.splitAxis !== null) {
      // give the removed size to the neighbor child
      const variableAxis = reverseAxis(this.splitAxis);
      const neighborIndex = index === this.children.length - 1? index - 1: index + 1;
      let newSize = this.children[neighborIndex].size.slice();
      newSize[variableAxis] += child.size[variableAxis];
      this.children[neighborIndex].resize(newSize);
    }

    this.children.splice(index, 1);
    if (this.parent !== null) {
      if (this.children.length === 0) {
        this.parent.removeChild(this);
        // TODO: delete this ?
      } else if (this.children.length === 1) {
        // container must have two or more children
        this.parent.replaceChild(this, this.children[0]);
        this.children[0].changeParent(this.parent);
        // TODO: delete this ?
      }
    }
    rootContainer.reload();
  }

  replaceChild(oldChild, newChild) {
    const index = this.children.indexOf(oldChild);
    this.children.splice(index, 1, newChild);
  }

  getMinimumSize() {
    const fixedAxis = this.splitAxis;
    const variableAxis = reverseAxis(this.splitAxis);
    // check sum of the children's size in the splitted axis
    let minimumSize = [0, 0];
    for (var i = 0; i < this.children.length; i++) {
      let childMinimumSize = this.children[i].getMinimumSize();
      minimumSize[variableAxis] += childMinimumSize[variableAxis];
      if (childMinimumSize[fixedAxis] > minimumSize[fixedAxis])
        minimumSize[fixedAxis] = childMinimumSize[fixedAxis];
    }
    return minimumSize;
  }

  getPosition() {
    let position = [1, 1];
    if (this.parent != null) {
      position = this.parent.getChildPosition(this);
    }
    return position;
  }

  getChildPosition(child) {
    const variableAxid = reverseAxis(this.splitAxis);
    let position = this.getPosition();
    for (var i = 0; i < this.children.length; i++) {
      if (this.children[i] === child || this.splitAxis === null) return position;
      position[variableAxid] += this.children[i].size[variableAxid];
    }
    console.error('cannot find position');
  }

  resize(size) {
    // TODO: can be refactored without returning the final size (just check resizability before resize)
    if (this.size[0] === size[0] && this.size[1] === size[1]) return this.size;

    const fixedAxis = this.splitAxis;
    const variableAxis = reverseAxis(this.splitAxis);
    // check sum of the children's size in the splitted axis
    let totalWidth = 0;  // means width (horizontal width) or height (vertical width)
    for (var i = 0; i < this.children.length; i++)
      totalWidth += this.children[i].size[variableAxis];
    let resizeRatio = size[variableAxis] / totalWidth;  // could be 1.0

    // propagate to the children
    let childSize = [0, 0];
    childSize[fixedAxis] = size[fixedAxis];
    totalWidth = 0;
    for (var i = 0; i < this.children.length - 1; i++) {
      childSize[variableAxis] = parseInt(this.children[i].size[variableAxis] * resizeRatio);
      const childFinalSize = this.children[i].resize(childSize);
      totalWidth += childFinalSize[variableAxis];
    }
    childSize[variableAxis] = size[variableAxis] - totalWidth;
    const childFinalSize = this.children[this.children.length - 1].resize(childSize);
    totalWidth += childFinalSize[variableAxis];

    // assume the fixed axis size is the same in the all children (should be)
    this.size[variableAxis] = totalWidth;
    this.size[fixedAxis] = childFinalSize[fixedAxis];
    return this.size;
  }

  canResize(childLeftOrUpper, childRightOrLower, axis, step) {
    // childLeftOrUpper should be the left or upper child
    // step direction: to the right or upper is positive
    let mimimumSizeA = childLeftOrUpper.getMinimumSize();
    let mimimumSizeB = childRightOrLower.getMinimumSize();
    return (mimimumSizeA[axis] <= childLeftOrUpper.size[axis] + step &&
      mimimumSizeB[axis] <= childRightOrLower.size[axis] - step);
  }

  resizeChild(child, axis, step) {
    if (this.splitAxis === null || this.splitAxis === axis) {
      if (this.parent !== null) this.parent.resizeChild(this, axis, step);
      return;
    }
    if (this.children.length < 2) {
      console.error('invalid child size: ' + this.children.length);
      return;
    }

    let index = this.children.indexOf(child);
    if (index === this.children.length - 1) index -= 1;
    if (!this.canResize(this.children[index], this.children[index + 1], axis, step)) {
      console.warn('failed to resize due to size limit');
      return;
    }

    let childSize = [0, 0];
    // resize the left or upper child
    childSize = this.children[index].size.slice();
    childSize[axis] = this.children[index].size[axis] + step;
    this.children[index].resize(childSize);
    // resize the right or lower child
    childSize = this.children[index + 1].size.slice();
    childSize[axis] = this.children[index + 1].size[axis] - step;
    this.children[index + 1].resize(childSize);
  }

  reload() {
    for (var i = 0; i < this.children.length; i++) this.children[i].reload();
  }
}

class Pane extends Container {
  constructor(parent, size) {
    super(parent, size, null);

    this.div = document.createElement('div');
    document.getElementById('container').appendChild(this.div);

    this.iframe = document.createElement('iframe');
    this.iframe.src = '/static/html/pane.html';
    this.iframe.style.width = '100%';
    this.iframe.style.height = '100%';
    this.iframe.style.cssFloat = 'relative';
    this.iframe.frameBorder = '0';  // not recommended (deprecated)
    this.div.appendChild(this.iframe);

    this.command_triggered = false;
    this.onload = this.onLoad.bind(this);
    this.onkeydown = this.onKeyDown.bind(this);
    this.iframe.addEventListener('load', this.onload, false);
  }

  remove() {
    document.getElementById('container').removeChild(this.div);
    this.parent.removeChild(this);
  }

  split(splitAxis) {
    const variableAxis = reverseAxis(splitAxis);
    let newMySize = this.size.slice();
    newMySize[variableAxis] = parseInt(newMySize[variableAxis] / 2);
    let newOtherSize = this.size.slice();
    newOtherSize[variableAxis] = this.size[variableAxis] - newMySize[variableAxis];

    if (this.parent !== null && this.parent.splitAxis == splitAxis) {
      let newChild = new Pane(this.parent, newOtherSize);
      let position = this.parent.indexOf(this);
      this.parent.insertChild(newChild, position + 1);
      this.size = newMySize;
      this.parent.reload();
    } else {
      let newParent = new Container(this.parent, this.size, splitAxis);
      let newChild = new Pane(newParent, newOtherSize);
      this.size = newMySize;
      if (this.parent !== null)
        this.parent.replaceChild(this, newParent);
      this.changeParent(newParent);

      newParent.appendChild(this);
      newParent.appendChild(newChild);
      newParent.reload();
    }
  }

  getMinimumSize() {
    return minimumSize;
  }

  resize(size) {
    this.size = size.slice();
    if (this.size[0] < minimumSize[0]) this.size[0] = minimumSize[0];
    if (this.size[1] < minimumSize[1]) this.size[1] = minimumSize[1];

    const position = this.getPosition();
    this.div.style.gridColumn = position[0] + '/' + (position[0] + this.size[0]);
    this.div.style.gridRow = position[1] + '/' + (position[1] + this.size[1]);
    return this.size;
  }

  reload() {
    const position = this.getPosition();
    this.div.style.gridColumn = position[0] + '/' + (position[0] + this.size[0]);
    this.div.style.gridRow = position[1] + '/' + (position[1] + this.size[1]);
  }

  onLoad() {
    return this.iframe.contentWindow.document.addEventListener('keydown', this.onkeydown);
  }

  onKeyDown(event) {
    if (event.key === 'b' && event.ctrlKey) {
      this.command_triggered = true;
      return;
    } else if (event.key === 'd' && event.ctrlKey) {
      console.info('remove');
      this.remove();
      rootContainer.reload();
      return;
    }
    if (this.command_triggered) {
      if (event.key === '"') {
        console.info('split horizontally');
        this.split(Axis.horizontal);
        this.command_triggered = false;
      } else if (event.key === '%') {
        console.info('split vertically');
        this.split(Axis.vertical);
        this.command_triggered = false;
      } else if (event.key === 'x') {
        console.info('remove');
        this.remove();
        rootContainer.reload();
        this.command_triggered = false;
      } else if (event.key === 'ArrowLeft') {
        console.info('left');
        this.parent.resizeChild(this, Axis.horizontal, -1);
        this.command_triggered = false;
      } else if (event.key === 'ArrowRight') {
        console.info('right');
        this.parent.resizeChild(this, Axis.horizontal, 1);
        this.command_triggered = false;
      } else if (event.key === 'ArrowUp') {
        console.info('up');
        this.parent.resizeChild(this, Axis.vertical, -1);
        this.command_triggered = false;
      } else if (event.key === 'ArrowDown') {
        console.info('down');
        this.parent.resizeChild(this, Axis.vertical, 1);
        this.command_triggered = false;
      }
    }
  }
}

let rootContainer = undefined;

window.onload = function () {
  var wrapper = document.getElementById('container');
  wrapper.style.display = 'grid';
  wrapper.style.gridTemplateRows = 'repeat(' + rowCount + ', ' + 100.0 / rowCount + '%)';
  wrapper.style.gridTemplateColumns = 'repeat(' + colCount + ', ' + 100.0 / colCount + '%)';

  // rootContainer = new Pane(null, colCount, rowCount);
  rootContainer = new Container(null, [colCount, rowCount], null);
  let initialPane = new Pane(rootContainer, [colCount, rowCount]);
  rootContainer.appendChild(initialPane);
  rootContainer.reload();
}
