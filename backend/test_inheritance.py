"""
思流图多父节点继承功能测试用例
测试多分支汇总场景下的上下文继承逻辑
"""

from datetime import datetime
from models import (
    MindMap, Node, Edge, Message, 
    NodeType, RelationType, MessageRole, NodeColor
)


class TestMultiParentInheritance:
    """多父节点继承功能测试类"""
    
    def setup_method(self):
        """每个测试方法前初始化"""
        self.mindmap = MindMap(title="测试思维导图", description="多父节点继承测试")
    
    def test_single_parent_inheritance(self):
        """测试单父节点继承场景"""
        # 创建父节点
        parent = self.mindmap.create_node("父节点A", node_type=NodeType.ROOT)
        parent.add_message(MessageRole.USER, "父节点的问题")
        parent.add_message(MessageRole.ASSISTANT, "父节点的回答")
        
        # 创建子节点
        child = self.mindmap.create_node("子节点", parent_id=parent.id)
        child.add_message(MessageRole.USER, "子节点的问题")
        
        # 获取子节点的上下文
        context = self.mindmap.get_node_context(child.id)
        
        # 验证上下文包含父节点的对话
        assert len(context) > 1
        assert any("父节点A" in msg.get("content", "") for msg in context)
        assert any("父节点的问题" in msg.get("content", "") for msg in context)
        assert any("子节点的问题" in msg.get("content", "") for msg in context)
        print("✓ 单父节点继承测试通过")
    
    def test_multi_parent_via_parent_ids(self):
        """测试通过parent_ids实现多父节点继承"""
        # 创建两个父节点
        parent1 = self.mindmap.create_node("父节点1", node_type=NodeType.ROOT)
        parent1.add_message(MessageRole.USER, "父节点1的问题")
        parent1.add_message(MessageRole.ASSISTANT, "父节点1的回答")
        
        parent2 = self.mindmap.create_node("父节点2", node_type=NodeType.ROOT)
        parent2.add_message(MessageRole.USER, "父节点2的问题")
        parent2.add_message(MessageRole.ASSISTANT, "父节点2的回答")
        
        # 创建子节点，手动添加两个父节点
        child = self.mindmap.create_node("汇总节点")
        child.parent_ids = [parent1.id, parent2.id]  # 多父节点
        child.add_message(MessageRole.USER, "汇总问题")
        
        # 获取子节点的上下文
        context = self.mindmap.get_node_context(child.id)
        
        # 验证上下文包含两个父节点的对话
        content_text = " ".join([msg.get("content", "") for msg in context])
        
        assert "父节点1" in content_text
        assert "父节点2" in content_text
        assert "父节点1的问题" in content_text
        assert "父节点2的问题" in content_text
        assert "多分支汇总" in content_text  # 验证多分支标识
        print("✓ 多父节点（via parent_ids）继承测试通过")
    
    def test_multi_parent_via_edges(self):
        """测试通过PARENT_CHILD关系线实现多父节点继承"""
        # 创建两个父节点（分支A和分支B）
        branch_a = self.mindmap.create_node("分支A", node_type=NodeType.ROOT)
        branch_a.add_message(MessageRole.USER, "分支A的讨论内容")
        branch_a.add_message(MessageRole.ASSISTANT, "分支A的AI回复")
        
        branch_b = self.mindmap.create_node("分支B", node_type=NodeType.ROOT)
        branch_b.add_message(MessageRole.USER, "分支B的讨论内容")
        branch_b.add_message(MessageRole.ASSISTANT, "分支B的AI回复")
        
        # 创建一个汇总节点
        summary = self.mindmap.create_node("汇总讨论节点")
        summary.add_message(MessageRole.USER, "汇总讨论的问题")
        
        # 通过关系线连接两个分支到汇总节点（模拟多父节点）
        edge1 = self.mindmap.create_edge(
            source_id=branch_a.id,
            target_id=summary.id,
            relation_type=RelationType.PARENT_CHILD,
            label="继承分支A"
        )
        
        edge2 = self.mindmap.create_edge(
            source_id=branch_b.id,
            target_id=summary.id,
            relation_type=RelationType.PARENT_CHILD,
            label="继承分支B"
        )
        
        # 获取汇总节点的上下文
        context = self.mindmap.get_node_context(summary.id)
        
        # 验证上下文包含两个分支的内容
        content_text = " ".join([msg.get("content", "") for msg in context])
        
        assert "分支A" in content_text, "应该包含分支A的上下文"
        assert "分支B" in content_text, "应该包含分支B的上下文"
        assert "分支A的讨论内容" in content_text, "应该包含分支A的具体内容"
        assert "分支B的讨论内容" in content_text, "应该包含分支B的具体内容"
        assert "多分支汇总" in content_text, "应该显示多分支汇总标识"
        
        # 验证父节点数量标识
        parent_count_indicators = [msg for msg in context if "父节点 1/2" in msg.get("content", "") or "父节点 2/2" in msg.get("content", "")]
        assert len(parent_count_indicators) == 2, "应该有两个父节点标识"
        
        print("✓ 多父节点（via edges）继承测试通过")
    
    def test_mixed_inheritance_sources(self):
        """测试混合继承来源（parent_ids + edges）"""
        # 创建父节点A（通过parent_ids）
        parent_a = self.mindmap.create_node("父节点A", node_type=NodeType.ROOT)
        parent_a.add_message(MessageRole.USER, "父节点A的内容")
        
        # 创建父节点B（通过edge）
        parent_b = self.mindmap.create_node("父节点B", node_type=NodeType.ROOT)
        parent_b.add_message(MessageRole.USER, "父节点B的内容")
        
        # 创建子节点，同时通过两种方式关联
        child = self.mindmap.create_node("子节点", parent_id=parent_a.id)
        
        # 额外通过edge关联parent_b
        edge = self.mindmap.create_edge(
            source_id=parent_b.id,
            target_id=child.id,
            relation_type=RelationType.PARENT_CHILD
        )
        
        context = self.mindmap.get_node_context(child.id)
        content_text = " ".join([msg.get("content", "") for msg in context])
        
        assert "父节点A" in content_text
        assert "父节点B" in content_text
        print("✓ 混合继承来源测试通过")
    
    def test_inheritance_disabled(self):
        """测试禁用继承功能"""
        parent = self.mindmap.create_node("父节点", node_type=NodeType.ROOT)
        parent.add_message(MessageRole.USER, "父节点内容")
        
        child = self.mindmap.create_node("子节点", parent_id=parent.id)
        child.inherit_parent_context = False  # 禁用继承
        child.add_message(MessageRole.USER, "子节点内容")
        
        context = self.mindmap.get_node_context(child.id)
        content_text = " ".join([msg.get("content", "") for msg in context])
        
        assert "父节点" not in content_text, "禁用继承后不应包含父节点内容"
        assert "子节点内容" in content_text, "应包含自身内容"
        print("✓ 禁用继承功能测试通过")
    
    def test_circular_inheritance_prevention(self):
        """测试循环继承防护"""
        node_a = self.mindmap.create_node("节点A", node_type=NodeType.ROOT)
        node_b = self.mindmap.create_node("节点B", parent_id=node_a.id)
        node_c = self.mindmap.create_node("节点C", parent_id=node_b.id)
        
        # 尝试创建循环（C的父节点包含A）
        node_c.parent_ids.append(node_a.id)
        
        # 获取上下文不应导致无限循环
        context = self.mindmap.get_node_context(node_c.id)
        assert len(context) > 0
        print("✓ 循环继承防护测试通过")
    
    def test_context_order(self):
        """测试上下文顺序：父节点在前，自身在后"""
        parent = self.mindmap.create_node("父节点", node_type=NodeType.ROOT)
        parent.add_message(MessageRole.USER, "父节点消息")
        
        child = self.mindmap.create_node("子节点", parent_id=parent.id)
        child.add_message(MessageRole.USER, "子节点消息")
        
        context = self.mindmap.get_node_context(child.id)
        
        # 找到父节点和子节点消息的索引
        parent_idx = -1
        child_idx = -1
        
        for i, msg in enumerate(context):
            if msg.get("content") == "父节点消息":
                parent_idx = i
            if msg.get("content") == "子节点消息":
                child_idx = i
        
        assert parent_idx != -1 and child_idx != -1
        assert parent_idx < child_idx, "父节点消息应在子节点消息之前"
        print("✓ 上下文顺序测试通过")


class TestInheritanceHighlighting:
    """继承关系高亮功能测试类"""
    
    def test_get_inheritance_parent_ids(self):
        """测试获取继承父节点ID函数"""
        from components.MindMapCanvas import getInheritanceParentIds
        
        mindmap = MindMap(title="测试")
        parent1 = mindmap.create_node("父节点1")
        parent2 = mindmap.create_node("父节点2")
        child = mindmap.create_node("子节点")
        
        # 设置parent_ids
        child.parent_ids = [parent1.id, parent2.id]
        
        parent_ids = getInheritanceParentIds(mindmap, child.id)
        
        assert parent1.id in parent_ids
        assert parent2.id in parent_ids
        assert len(parent_ids) == 2
        print("✓ 获取继承父节点ID测试通过")
    
    def test_get_inheritance_edge_ids(self):
        """测试获取继承关系边ID函数"""
        from components.MindMapCanvas import getInheritanceEdgeIds
        
        mindmap = MindMap(title="测试")
        parent = mindmap.create_node("父节点")
        child = mindmap.create_node("子节点")
        
        edge = mindmap.create_edge(
            source_id=parent.id,
            target_id=child.id,
            relation_type=RelationType.PARENT_CHILD
        )
        
        edge_ids = getInheritanceEdgeIds(mindmap, child.id)
        
        assert edge.id in edge_ids
        print("✓ 获取继承关系边ID测试通过")


def run_tests():
    """运行所有测试"""
    print("\n" + "="*60)
    print("开始运行多父节点继承功能测试")
    print("="*60 + "\n")
    
    test_class = TestMultiParentInheritance()
    
    test_class.setup_method()
    test_class.test_single_parent_inheritance()
    
    test_class.setup_method()
    test_class.test_multi_parent_via_parent_ids()
    
    test_class.setup_method()
    test_class.test_multi_parent_via_edges()
    
    test_class.setup_method()
    test_class.test_mixed_inheritance_sources()
    
    test_class.setup_method()
    test_class.test_inheritance_disabled()
    
    test_class.setup_method()
    test_class.test_circular_inheritance_prevention()
    
    test_class.setup_method()
    test_class.test_context_order()
    
    print("\n" + "="*60)
    print("所有测试通过！✓")
    print("="*60 + "\n")


if __name__ == "__main__":
    run_tests()
