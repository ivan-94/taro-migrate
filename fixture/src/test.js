class Common {
  hello() {
    // 父类可以访问子类扩展的方法和属性，这是和其他语言不一致的
    // 主要还是 this 设计问题
    console.log(this.$router)
  }
}

class Base extends Common {
  get $router() {
    return 'shit'
  }
}

const base = new Base()
base.hello()
